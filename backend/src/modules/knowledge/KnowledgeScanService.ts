import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { moderate } from '../../modules/safety/moderationService';

const PII_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { label: 'phone', regex: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g },
  { label: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'credit_card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
  { label: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { label: 'passport', regex: /\b[A-Z]{1,2}\d{6,9}\b/g },
  { label: 'api_key', regex: /\b(sk-[A-Za-z0-9]{20,}|api[_-]?key[_-]?['\"]?\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,})/gi },
  { label: 'aws_key', regex: /\b(AKIA[0-9A-Z]{16})\b/g },
  { label: 'private_key', regex: /\b(BEGIN\s+(RSA\s+)?PRIVATE\s+KEY|-----BEGIN\s+[A-Z\s]+KEY-----)/g },
  { label: 'password', regex: /\b(password|passwd|pwd|secret)\s*[:=]\s*['\"]?[A-Za-z0-9!@#$%^&*()_+]{8,}/gi },
  { label: 'connection_string', regex: /(postgresql|mysql|mongodb|redis|amqp):\/\/[^\s]{10,}/g },
  { label: 'github_token', regex: /\b(ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{36,})\b/g },
  { label: 'slack_token', regex: /\b(xox[abpors]-[A-Za-z0-9]{10,})\b/g },
];

const OFFENSIVE_DICTIONARY = [
  /\b(offensive|toxic|hateful)\b/i,
];

interface ScanResult {
  passed: boolean;
  blocked: boolean;
  findings: ScanFinding[];
}

interface ScanFinding {
  type: string;
  label: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string[];
}

export class KnowledgeScanService {
  static async scanForPII(text: string): Promise<ScanResult> {
    const findings: ScanFinding[] = [];

    for (const pattern of PII_PATTERNS) {
      const matches: string[] = [];
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push(match[0]);
      }
      if (matches.length > 0) {
        const severity: 'low' | 'medium' | 'high' | 'critical' =
          pattern.label === 'ssn' || pattern.label === 'credit_card' ||
          pattern.label === 'private_key' || pattern.label === 'password' ||
          pattern.label === 'connection_string' || pattern.label === 'github_token' ||
          pattern.label === 'slack_token' || pattern.label === 'api_key' ||
          pattern.label === 'aws_key' || pattern.label === 'jwt_token' ? 'critical' :
          pattern.label === 'email' || pattern.label === 'phone' ||
          pattern.label === 'ip_address' || pattern.label === 'passport' ? 'medium' : 'low';
        findings.push({
          type: 'pii',
          label: pattern.label,
          count: matches.length,
          severity,
          details: matches.slice(0, 5),
        });
      }
    }

    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    return {
      passed: findings.length === 0,
      blocked: criticalCount > 0,
      findings,
    };
  }

  static async scanForOffensiveContent(text: string): Promise<ScanResult> {
    const findings: ScanFinding[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of OFFENSIVE_DICTIONARY) {
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        matches.push(match[0]);
      }
      if (matches.length > 0) {
        findings.push({
          type: 'offensive',
          label: 'offensive_pattern',
          count: matches.length,
          severity: 'high',
          details: matches.slice(0, 10),
        });
      }
    }

    return {
      passed: findings.length === 0,
      blocked: findings.length > 0,
      findings,
    };
  }

  static async detectDuplicates(
    sourceId: string,
    fingerprint: string,
    sourceTitle: string,
    text: string,
    collectionId: string,
  ): Promise<ScanResult> {
    const findings: ScanFinding[] = [];

    const { data: duplicates } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, duplicate_fingerprint, status, superseded_by')
      .eq('collection_id', collectionId)
      .neq('id', sourceId)
      .neq('status', 'RETIRED')
      .not('duplicate_fingerprint', 'is', null);

    if (duplicates && duplicates.length > 0) {
      const identicalFingerprint = duplicates.filter(
        (d: any) => d.duplicate_fingerprint === fingerprint
      );

      if (identicalFingerprint.length > 0) {
        findings.push({
          type: 'duplicate',
          label: 'identical_fingerprint',
          count: identicalFingerprint.length,
          severity: 'high',
          details: identicalFingerprint.map((d: any) =>
            `Identical to ${d.title} (${d.id})`
          ),
        });
      }

      const exactTitleMatch = duplicates.filter(
        (d: any) => d.title.toLowerCase() === sourceTitle.toLowerCase()
      );
      if (exactTitleMatch.length > 0 && identicalFingerprint.length === 0) {
        findings.push({
          type: 'duplicate',
          label: 'near_duplicate',
          count: exactTitleMatch.length,
          severity: 'medium',
          details: exactTitleMatch.map((d: any) =>
            `Similar title to ${d.title} (${d.id})`
          ),
        });
      }
    }

    const existingClaims = await supabaseAdmin
      .from('knowledge_claims')
      .select('claim_text, source_id, sources!inner(title)')
      .eq('source_id', sourceId);

    if (existingClaims.error) {
      logger.warn({ error: existingClaims.error }, 'Failed to check existing claims for overlap');
    }

    return {
      passed: findings.length === 0,
      blocked: findings.some(f => f.label === 'identical_fingerprint'),
      findings,
    };
  }

  static async runAllScans(
    sourceId: string,
    text: string,
    fingerprint: string,
    sourceTitle: string,
    collectionId: string,
  ): Promise<{
    pii: ScanResult;
    offensive: ScanResult;
    duplicate: ScanResult;
    safety: ScanResult;
    overallPassed: boolean;
    overallBlocked: boolean;
    allFindings: ScanFinding[];
  }> {
    const [pii, offensive, duplicate, safety] = await Promise.all([
      this.scanForPII(text),
      this.scanForOffensiveContent(text),
      this.detectDuplicates(sourceId, fingerprint, sourceTitle, text, collectionId),
      this.scanForSafety(text),
    ]);

    const allFindings = [...pii.findings, ...offensive.findings, ...duplicate.findings, ...safety.findings];
    const overallBlocked = pii.blocked || offensive.blocked || duplicate.blocked || safety.blocked;
    const overallPassed = !overallBlocked && allFindings.length === 0;

    await supabaseAdmin
      .from('knowledge_sources')
      .update({
        scan_status: overallBlocked ? 'blocked' : overallPassed ? 'passed' : 'failed',
        scan_results: { pii, offensive, duplicate, scanned_at: new Date().toISOString() },
      })
      .eq('id', sourceId);

    for (const finding of allFindings) {
      await supabaseAdmin
        .from('knowledge_scan_log')
        .insert({
          source_id: sourceId,
          scan_type: finding.type as any,
          status: finding.severity === 'critical' || finding.label === 'identical_fingerprint' ? 'blocked' : 'failed',
          result: finding,
          blocked: finding.severity === 'critical' || finding.label === 'identical_fingerprint',
        });
    }

    if (overallBlocked) {
      internalEventBus.emit('knowledge.quarantined', {
        source_id: sourceId,
        reason: allFindings.filter(f => f.severity === 'critical' || f.label === 'identical_fingerprint').map(f => f.label),
      });
    }

    return { pii, offensive, duplicate, safety, overallPassed, overallBlocked, allFindings };
  }

  private static async scanForSafety(text: string): Promise<ScanResult> {
    try {
      const result = await moderate({ content: text });
      const findings: ScanFinding[] = [];
      if (!result.safe && result.matches.length > 0) {
        for (const match of result.matches.slice(0, 20)) {
          findings.push({
            type: 'safety',
            label: match.category,
            count: 1,
            severity: match.severity === 'critical' ? 'critical' : match.severity === 'high' ? 'high' : 'medium',
            details: [`${match.pattern} at position ${match.position.start}`],
          });
        }
      }
      const blocked = result.verdict === 'block';
      return {
        passed: !blocked && findings.length === 0,
        blocked,
        findings,
      };
    } catch {
      return { passed: true, blocked: false, findings: [] };
    }
  }
}
