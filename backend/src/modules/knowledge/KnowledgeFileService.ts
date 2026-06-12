import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../../shared/logger';

export class KnowledgeFileService {
  
  /**
   * Extract text content from various file formats
   */
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      
      if (mimeType === 'application/pdf') {
        const data = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text: string }>)(buffer);
        return data.text;
      }
      
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      
      if (mimeType === 'application/json' || filePath.endsWith('.json')) {
        return buffer.toString('utf8');
      }

      if (mimeType === 'text/plain' || mimeType === 'text/markdown' || filePath.endsWith('.md') || filePath.endsWith('.txt')) {
        return buffer.toString('utf8');
      }

      throw new Error(`Unsupported file type: ${mimeType}`);
    } catch (error) {
      logger.error({ error, filePath, mimeType }, 'Failed to extract text from file');
      throw new Error('Could not process the uploaded file. Please ensure it is a valid PDF, DOCX, TXT, or MD file.');
    } finally {
      // Clean up temporary file after processing
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          logger.warn({ cleanupErr, filePath }, 'Failed to delete temp file');
        }
      }
    }
  }
}
