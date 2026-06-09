/**
 * PDI Band taxonomy (Phase 6 — MD-compliant).
 *
 *   95-100  EXCELLENT — fully defensible, full autonomy
 *   85-94   STRONG    — defensible, normal autonomy
 *   70-84   MODERATE  — defensible with autonomy restrictions
 *   0-69    WEAK      — not defensible, deployment blocked
 *
 *   Autonomy levels (derived from band):
 *     EXCELLENT  -> FULL          (no restrictions)
 *     STRONG     -> RESTRICTED    (human review on flagged outputs)
 *     MODERATE   -> SUPERVISED    (human approval required for output)
 *     WEAK       -> BLOCKED       (cannot execute; raise PDI before retry)
 */
export type PDIBand = 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT';

export type AutonomyLevel = 'BLOCKED' | 'SUPERVISED' | 'RESTRICTED' | 'FULL';

export const PDI_BAND_EXCELLENT_MIN = 95;
export const PDI_BAND_STRONG_MIN = 85;
export const PDI_BAND_MODERATE_MIN = 70;

export function computePDIBand(score: number): PDIBand {
  if (score >= PDI_BAND_EXCELLENT_MIN) return 'EXCELLENT';
  if (score >= PDI_BAND_STRONG_MIN) return 'STRONG';
  if (score >= PDI_BAND_MODERATE_MIN) return 'MODERATE';
  return 'WEAK';
}

export function deriveAutonomyLevel(band: PDIBand): AutonomyLevel {
  switch (band) {
    case 'EXCELLENT':
      return 'FULL';
    case 'STRONG':
      return 'RESTRICTED';
    case 'MODERATE':
      return 'SUPERVISED';
    case 'WEAK':
    default:
      return 'BLOCKED';
  }
}

/**
 * Returns true if the deployment gate should block a version based on the PDI
 * band alone. WEAK bands always block. MODERATE bands are deployable but with
 * restricted autonomy at runtime. STRONG and EXCELLENT proceed normally.
 */
export function isPDIBandDeploymentBlocked(band: PDIBand): boolean {
  return band === 'WEAK';
}

/**
 * Human-readable band description for evidence / receipts / dashboards.
 */
export function describePDIBand(band: PDIBand): string {
  switch (band) {
    case 'EXCELLENT':
      return 'Excellent — full autonomy, eligible for unsupervised production execution';
    case 'STRONG':
      return 'Strong — defensible, restricted autonomy (human review on flagged outputs)';
    case 'MODERATE':
      return 'Moderate — defensible with autonomy restrictions (supervised execution)';
    case 'WEAK':
    default:
      return 'Weak — not defensible; deployment blocked until PDI improves';
  }
}
