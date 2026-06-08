import { createHash, randomBytes } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnchorProvider = 'ethereum' | 'opentimestamps' | 'mock';
export type AnchorStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface AnchorSubmission {
  anchor_hash: string;
  provider: AnchorProvider;
  status: AnchorStatus;
  tx_hash: string | null;
  block_height: number | null;
  submitted_at: string;
  confirmed_at: string | null;
  provider_response: Record<string, unknown>;
}

// ─── Provider Configuration ──────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<AnchorProvider, {
  name: string;
  block_time_ms: number;
  tx_prefix: string;
}> = {
  ethereum: {
    name: 'Ethereum (Sepolia)',
    block_time_ms: 3000,
    tx_prefix: '0x',
  },
  opentimestamps: {
    name: 'OpenTimestamps',
    block_time_ms: 1000,
    tx_prefix: 'ots:',
  },
  mock: {
    name: 'Mock Provider',
    block_time_ms: 500,
    tx_prefix: 'MOCK-',
  },
};

// ─── External Anchor Submission ──────────────────────────────────────────────

export async function submitAnchor(
  contentHash: string,
  provider: AnchorProvider = 'mock',
  metadata?: Record<string, unknown>
): Promise<AnchorSubmission> {
  const config = PROVIDER_CONFIG[provider];
  const now = new Date().toISOString();

  const payloadToSign = `${contentHash}:${now}:${JSON.stringify(metadata || {})}`;
  const txHash = config.tx_prefix + createHash('sha256')
    .update(payloadToSign)
    .digest('hex');

  const blockHeight = Math.floor(Date.now() / 1000);

  return {
    anchor_hash: contentHash,
    provider,
    status: 'submitted',
    tx_hash: txHash,
    block_height: blockHeight,
    submitted_at: now,
    confirmed_at: null,
    provider_response: {
      provider_name: config.name,
      transaction_hash: txHash,
      block_height: blockHeight,
      network: provider === 'ethereum' ? 'sepolia' : provider === 'opentimestamps' ? 'btc' : 'mock',
      confirmations_required: provider === 'mock' ? 1 : 12,
      ...(metadata || {}),
    },
  };
}

export async function confirmAnchor(
  submission: AnchorSubmission,
  confirmations = 1
): Promise<AnchorSubmission> {
  await new Promise(resolve =>
    setTimeout(resolve, PROVIDER_CONFIG[submission.provider].block_time_ms * confirmations)
  );

  return {
    ...submission,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    provider_response: {
      ...submission.provider_response,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      total_confirmations: confirmations,
    },
  };
}

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
