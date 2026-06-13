import { createHash, randomBytes } from 'crypto';

export type AnchorProvider = 'ethereum' | 'opentimestamps';

export function computeAnchorHash(
  data: Record<string, unknown>
): string {
  const sorted = JSON.stringify(data, Object.keys(data).sort());
  return `anchor:sha256:${createHash('sha256').update(sorted).digest('hex')}`;
}

export function verifyAnchorIntegrity(
  data: Record<string, unknown>,
  storedAnchorHash: string
): { valid: boolean; computed_hash: string; stored_hash: string; reason?: string } {
  const computed = computeAnchorHash(data);
  const valid = computed === storedAnchorHash;

  return {
    valid,
    computed_hash: computed,
    stored_hash: storedAnchorHash,
    reason: valid ? undefined : 'Hash mismatch — data may have been tampered with',
  };
}

export function generateAnchorId(): string {
  return `ANCHOR-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateAnchorTxId(): string {
  return randomBytes(32).toString('hex');
}
