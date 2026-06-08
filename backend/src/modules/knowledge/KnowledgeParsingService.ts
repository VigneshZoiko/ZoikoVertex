export interface ParsedDocument {
  title: string;
  headings: ParsedHeading[];
  paragraphs: ParsedParagraph[];
  tables: ParsedTable[];
  lists: ParsedList[];
  dates: string[];
  content: string;
}

export interface ParsedHeading {
  level: number;
  text: string;
}

export interface ParsedParagraph {
  text: string;
  heading_path: string;
  char_start: number;
  char_end: number;
}

export interface ParsedTable {
  heading_path: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedList {
  heading_path: string;
  items: string[];
  ordered: boolean;
}

export class KnowledgeParsingService {
  static parseText(text: string, sourceTitle?: string): ParsedDocument {
    const lines = text.split('\n');
    const headings: ParsedHeading[] = [];
    const paragraphs: ParsedParagraph[] = [];
    const tables: ParsedTable[] = [];
    const lists: ParsedList[] = [];
    const dates: string[] = [];
    let currentHeadingPath = '';
    let charPos = 0;
    let i = 0;

    const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},?\s*\d{4})\b/gi;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineLen = line.length;

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        headings.push({ level, text });
        currentHeadingPath = this.buildHeadingPath(headings);
        charPos += lineLen + 1;
        i++;
        continue;
      }

      const htmxMatch = trimmed.match(/^(={3,})\s*$/);
      if (htmxMatch && i > 0) {
        const prevTrimmed = lines[i - 1].trim();
        if (prevTrimmed && !prevTrimmed.match(/^(#{1,6}\s)/) && !prevTrimmed.match(/^(={3,})/) && !prevTrimmed.match(/^(-{3,})/)) {
          headings.push({ level: 1, text: prevTrimmed });
          currentHeadingPath = prevTrimmed;
          charPos += lineLen + 1;
          i++;
          continue;
        }
      }

      const htmxMatch2 = trimmed.match(/^(-{3,})\s*$/);
      if (htmxMatch2 && i > 0) {
        const prevTrimmed = lines[i - 1].trim();
        if (prevTrimmed && !prevTrimmed.match(/^(#{1,6}\s)/) && !prevTrimmed.match(/^(={3,})/) && !prevTrimmed.match(/^(-{3,})/) && !prevTrimmed.match(/^\d+[.\)]\s/)) {
          headings.push({ level: 2, text: prevTrimmed });
          currentHeadingPath = `${currentHeadingPath.split(' > ').slice(0, 1).join(' > ')} > ${prevTrimmed}`.replace(/^ > /, '');
          charPos += lineLen + 1;
          i++;
          continue;
        }
      }

      const dateMatches = trimmed.match(dateRegex);
      if (dateMatches) {
        dates.push(...dateMatches);
      }

      const tableMatch = trimmed.match(/^\|(.+)\|$/);
      if (tableMatch) {
        const rows: string[][] = [];
        let tableRowIdx = i;
        let headers: string[] = [];

        while (tableRowIdx < lines.length) {
          const tLine = lines[tableRowIdx].trim();
          if (!tLine.match(/^\|(.+)\|$/)) break;
          const cells = tLine.split('|').filter(c => c.trim()).map(c => c.trim());
          if (tableRowIdx === i) {
            headers = cells;
          } else if (!cells.every(c => /^[-:\s]+$/.test(c))) {
            rows.push(cells);
          }
          tableRowIdx++;
        }

        if (rows.length > 0 && headers.length > 0) {
          tables.push({ heading_path: currentHeadingPath, headers, rows });
        }
        i = tableRowIdx;
        charPos += rows.reduce((sum, r) => sum + r.join('|').length + 3, 0) + headers.join('|').length;
        continue;
      }

      if (trimmed.match(/^[\*\-\+]\s/) || trimmed.match(/^\d+[\.\)]\s/)) {
        const listItems: string[] = [];
        const ordered = !!trimmed.match(/^\d+[\.\)]\s/);
        while (i < lines.length) {
          const lLine = lines[i].trim();
          if (lLine.match(/^[\*\-\+]\s/) || lLine.match(/^\d+[\.\)]\s/)) {
            listItems.push(lLine.replace(/^[\*\-\+]\s/, '').replace(/^\d+[\.\)]\s/, ''));
          } else if (lLine === '' || lLine.startsWith('#')) {
            break;
          } else {
            if (listItems.length > 0) {
              listItems[listItems.length - 1] += ' ' + lLine;
            } else {
              break;
            }
          }
          i++;
        }
        if (listItems.length > 0) {
          lists.push({ heading_path: currentHeadingPath, items: listItems, ordered });
        }
        continue;
      }

      if (trimmed && !trimmed.match(/^[-*_]{3,}\s*$/) && !trimmed.match(/^\[.*\]:\s/)) {
        const paraStart = charPos;
        const paraLines: string[] = [trimmed];
        let paraEnd = charPos + lineLen;
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (!nextLine || nextLine.match(/^(#{1,6}\s)/) || nextLine.match(/^[\*\-\+]\s/) || nextLine.match(/^\d+[\.\)]\s/) || nextLine.match(/^\|/) || nextLine.match(/^={3,}$/) || nextLine.match(/^-{3,}$/)) {
            break;
          }
          paraLines.push(nextLine);
          paraEnd = charPos + lines[i].length;
          i++;
        }
        const paraText = paraLines.join(' ');
        if (paraText.length > 20) {
          paragraphs.push({
            text: paraText,
            heading_path: currentHeadingPath,
            char_start: paraStart,
            char_end: paraEnd,
          });
        }
        charPos = paraEnd + 1;
        continue;
      }

      charPos += lineLen + 1;
      i++;
    }

    return {
      title: sourceTitle || (headings.length > 0 ? headings[0].text : 'Untitled'),
      headings,
      paragraphs,
      tables,
      lists,
      dates: [...new Set(dates)],
      content: text,
    };
  }

  static extractClaimPassages(text: string): Array<{ text: string; type: string; confidence: number }> {
    const claims: Array<{ text: string; type: string; confidence: number }> = [];
    const sentences = text.match(/[^.!?\n]+[.!?]+/g) || [text];

    const patterns: Array<{ type: string; regex: RegExp; weight: number }> = [
      { type: 'performance', regex: /\b(\d{2,}%|\d+x\b|increase|decrease|improve|reduce|boost|accelerate|faster|better)\b/i, weight: 0.7 },
      { type: 'pricing', regex: /\b(\$\d+|price|cost|pricing|free|discount|subscription|billing|save|spend)\b/i, weight: 0.8 },
      { type: 'legal', regex: /\b(comply|regulation|legal|law|regulatory|statutory|obligation|liability|warrant)\b/i, weight: 0.9 },
      { type: 'compliance', regex: /\b(compliant|certified|standard|audit|policy|governance|gdpr|hipaa|sox|pci)\b/i, weight: 0.85 },
      { type: 'certification', regex: /\b(certified|certification|accredited|accreditation|qualified|iso|soc|fedramp)\b/i, weight: 0.9 },
      { type: 'integration', regex: /\b(integrat|api|connect|sync|plugin|extension|marketplace|connector)\b/i, weight: 0.6 },
    ];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed || trimmed.length < 15) continue;

      for (const pattern of patterns) {
        if (pattern.regex.test(trimmed)) {
          claims.push({ text: trimmed, type: pattern.type, confidence: pattern.weight });
          break;
        }
      }
    }

    return claims;
  }

  private static buildHeadingPath(headings: ParsedHeading[]): string {
    if (headings.length === 0) return '';
    const path = headings.map(h => h.text);
    return path.join(' > ');
  }
}
