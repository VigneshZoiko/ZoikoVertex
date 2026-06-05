import * as crypto from 'crypto';
import { logger } from '../../shared/logger';
import { KnowledgeParsingService, type ParsedDocument } from './KnowledgeParsingService';

export interface Chunk {
  chunk_index: number;
  text: string;
  heading_path: string;
  token_count: number;
  citation_anchor: string;
  hash: string;
  sensitivity_level: string;
}

export interface ChunkingOptions {
  maxChunkSize: number;
  chunkOverlap: number;
  strategy: 'fixed' | 'paragraph' | 'semantic' | 'heading';
  sensitivity_level?: string;
}

export class KnowledgeChunkingService {
  static readonly DEFAULT_OPTIONS: ChunkingOptions = {
    maxChunkSize: 1000,
    chunkOverlap: 200,
    strategy: 'semantic',
  };

  static chunk(
    sourceId: string,
    text: string,
    parsed?: ParsedDocument,
    options: Partial<ChunkingOptions> = {},
    sourceTitle?: string,
  ): Chunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const doc = parsed || KnowledgeParsingService.parseText(text, sourceTitle);
    const chunks: Chunk[] = [];

    switch (opts.strategy) {
      case 'heading':
        chunks.push(...this.headingBasedChunking(sourceId, doc, opts));
        break;
      case 'paragraph':
        chunks.push(...this.paragraphBasedChunking(sourceId, doc, opts));
        break;
      case 'semantic':
        chunks.push(...this.semanticChunking(sourceId, doc, opts));
        break;
      case 'fixed':
      default:
        chunks.push(...this.fixedSizeChunking(sourceId, text, opts));
        break;
    }

    return chunks;
  }

  private static fixedSizeChunking(sourceId: string, text: string, opts: ChunkingOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let idx = 0;
    let pos = 0;

    while (pos < text.length) {
      const end = Math.min(pos + opts.maxChunkSize, text.length);
      const chunkText = text.slice(pos, end);
      chunks.push(this.makeChunk(sourceId, idx, chunkText, '', opts.sensitivity_level || 'INTERNAL'));
      idx++;
      pos = end - opts.chunkOverlap;
      if (pos >= text.length - opts.maxChunkSize) break;
    }

    return chunks;
  }

  private static paragraphBasedChunking(sourceId: string, doc: ParsedDocument, opts: ChunkingOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let idx = 0;
    let currentText = '';
    let currentPath = '';
    let currentTokens = 0;

    for (const para of doc.paragraphs) {
      const paraTokens = this.estimateTokens(para.text);
      if (currentTokens + paraTokens > opts.maxChunkSize && currentText.length > 0) {
        chunks.push(this.makeChunk(sourceId, idx, currentText.trim(), currentPath, opts.sensitivity_level || 'INTERNAL'));
        idx++;
        currentText = para.text;
        currentPath = para.heading_path;
        currentTokens = paraTokens;
      } else {
        currentText += (currentText ? '\n\n' : '') + para.text;
        currentPath = para.heading_path;
        currentTokens += paraTokens;
      }
    }

    if (currentText.trim()) {
      chunks.push(this.makeChunk(sourceId, idx, currentText.trim(), currentPath, opts.sensitivity_level || 'INTERNAL'));
    }

    return chunks;
  }

  private static headingBasedChunking(sourceId: string, doc: ParsedDocument, opts: ChunkingOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let idx = 0;
    const sections = new Map<string, string[]>();

    for (const para of doc.paragraphs) {
      const path = para.heading_path || '__root__';
      if (!sections.has(path)) sections.set(path, []);
      sections.get(path)!.push(para.text);
    }

    for (const [path, texts] of sections) {
      const sectionText = texts.join('\n\n');
      if (this.estimateTokens(sectionText) <= opts.maxChunkSize) {
        chunks.push(this.makeChunk(sourceId, idx, sectionText, path, opts.sensitivity_level || 'INTERNAL'));
        idx++;
      } else {
        const subChunks = this.fixedSizeChunking(sourceId, sectionText, opts);
        for (const sc of subChunks) {
          chunks.push({ ...sc, chunk_index: idx, heading_path: path });
          idx++;
        }
      }
    }

    return chunks;
  }

  private static semanticChunking(sourceId: string, doc: ParsedDocument, opts: ChunkingOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let idx = 0;
    let currentText = '';
    let currentPath = '';
    let currentTokens = 0;

    for (const para of doc.paragraphs) {
      const paraTokens = this.estimateTokens(para.text);
      const isSectionBoundary = para.heading_path !== currentPath && para.text.length < 100;

      if (isSectionBoundary && currentText.length > 0) {
        chunks.push(this.makeChunk(sourceId, idx, currentText.trim(), currentPath, opts.sensitivity_level || 'INTERNAL'));
        idx++;
        currentText = para.text;
        currentPath = para.heading_path;
        currentTokens = paraTokens;
        continue;
      }

      if (currentTokens + paraTokens > opts.maxChunkSize && currentText.length > 0) {
        chunks.push(this.makeChunk(sourceId, idx, currentText.trim(), currentPath, opts.sensitivity_level || 'INTERNAL'));
        idx++;
        const overlapText = this.getOverlapText(currentText, opts.chunkOverlap);
        currentText = overlapText + (overlapText ? '\n\n' : '') + para.text;
        currentPath = para.heading_path;
        currentTokens = this.estimateTokens(currentText);
      } else {
        currentText += (currentText ? '\n\n' : '') + para.text;
        currentPath = para.heading_path || currentPath;
        currentTokens += paraTokens;
      }
    }

    if (currentText.trim()) {
      chunks.push(this.makeChunk(sourceId, idx, currentText.trim(), currentPath, opts.sensitivity_level || 'INTERNAL'));
    }

    return chunks;
  }

  private static getOverlapText(text: string, overlapChars: number): string {
    if (text.length <= overlapChars) return '';
    const lastPeriod = text.lastIndexOf('.', text.length - (text.length - overlapChars));
    if (lastPeriod > text.length - overlapChars * 2) {
      return text.slice(lastPeriod + 1).trim();
    }
    return text.slice(-overlapChars);
  }

  private static makeChunk(
    sourceId: string,
    index: number,
    text: string,
    headingPath: string,
    sensitivity: string,
  ): Chunk {
    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
    return {
      chunk_index: index,
      text,
      heading_path: headingPath,
      token_count: this.estimateTokens(text),
      citation_anchor: `chunk-${sourceId}-${index}`,
      hash,
      sensitivity_level: sensitivity,
    };
  }

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static computeHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
