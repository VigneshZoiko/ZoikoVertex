import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../../shared/logger';

interface FileValidation {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

export class KnowledgeFileService {

  static detectScannedContent(text: string, filePath: string): { is_scanned: boolean; confidence: number } {
    const ext = path.extname(filePath).toLowerCase();
    if ((ext === '.pdf' || ext === '.docx' || ext === '.pptx') && text.trim().length < 50) {
      const stat = fs.statSync(filePath);
      if (stat.size > 10240) {
        return { is_scanned: true, confidence: 0.9 };
      }
    }
    return { is_scanned: false, confidence: 0 };
  }

  static validateFile(filePath: string, originalname: string, mimetype: string, size: number): FileValidation {
    const ext = path.extname(originalname).toLowerCase();
    const maxSize = 50 * 1024 * 1024;

    if (size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    const allowedTypes: Record<string, string[]> = {
      '.pdf': ['application/pdf'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      '.txt': ['text/plain'],
      '.md': ['text/markdown', 'text/plain'],
      '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
    };

    const typeInfo = allowedTypes[ext];
    if (!typeInfo) {
      return { valid: false, error: `Unsupported file type: ${ext}. Allowed: PDF, DOCX, PPTX, TXT, MD, CSV` };
    }

    return { valid: true, mimeType: mimetype };
  }

  static computeDuplicateFingerprint(filePath: string, originalname: string): string {
    const stat = fs.statSync(filePath);
    const sample = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, sample, 0, 4096, 0);
    fs.closeSync(fd);
    const hash = crypto.createHash('sha256');
    hash.update(`${originalname}:${stat.size}:`);
    hash.update(sample);
    return hash.digest('hex');
  }

  static async extractText(filePath: string, mimeType: string): Promise<{ text: string; ocr_required: boolean }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let text: string;

      if (mimeType === 'application/pdf' || ext === '.pdf') {
        text = await this.extractPdf(filePath);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
        text = await this.extractDocx(filePath);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === '.pptx') {
        text = await this.extractPptx(filePath);
      } else if (ext === '.csv' || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
        text = this.parseCsv(filePath);
      } else if (mimeType === 'text/plain' || mimeType === 'text/markdown' || ext === '.md' || ext === '.txt') {
        text = fs.readFileSync(filePath, 'utf8');
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const scanned = this.detectScannedContent(text, filePath);
      return {
        text,
        ocr_required: scanned.is_scanned,
      };
    } catch (error) {
      logger.error({ error, filePath, mimeType }, 'Failed to extract text from file');
      throw new Error(`Could not process the uploaded file. ${(error as Error).message}`);
    } finally {
      this.cleanup(filePath);
    }
  }

  private static async extractPdf(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const data = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text: string }>)(buffer);
    return data.text;
  }

  private static async extractDocx(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private static async extractPptx(filePath: string): Promise<string> {
    const JSZip = require('jszip');
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const textParts: string[] = [];

    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort();

    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async('string');
      const textMatches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (textMatches) {
        for (const match of textMatches) {
          const tText = match.replace(/<[^>]+>/g, '');
          if (tText.trim()) textParts.push(tText.trim());
        }
      }
      textParts.push('');
    }

    return textParts.join('\n');
  }

  private static parseCsv(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const textParts: string[] = [];

    for (const line of lines) {
      const cells = this.parseCsvLine(line);
      textParts.push(cells.join(' | '));
    }

    return textParts.join('\n');
  }

  private static parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  private static cleanup(filePath: string): void {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        logger.warn({ cleanupErr, filePath }, 'Failed to delete temp file');
      }
    }
  }
}
