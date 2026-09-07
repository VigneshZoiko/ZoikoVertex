/**
 * campaignStatus.ts
 * ------------------------------------------------------------------
 * A campaign is effectively COMPLETED once its end date has passed, even if
 * its stored status is still ACTIVE / PAUSED / SCHEDULED. The campaign
 * lifecycle worker persists this to the DB on a schedule; this helper applies
 * the same rule on read so the UI reflects it immediately (no wait for the
 * worker's next pass).
 *
 * Note: on Meta's side the ad set carries an end_time, so Meta stops delivery
 * (and spend) at the end date on its own — this only keeps ZoikoVertex's
 * status/UI in sync with that reality.
 */

const RUNNING_STATUSES = ['ACTIVE', 'PAUSED', 'SCHEDULED'];

export function isPastEndDate(endAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!endAt && new Date(endAt).getTime() < now.getTime();
}

export function effectiveCampaignStatus(
  status: string | null | undefined,
  endAt: string | null | undefined,
  now: Date = new Date(),
): string {
  if (status && RUNNING_STATUSES.includes(status) && isPastEndDate(endAt, now)) {
    return 'COMPLETED';
  }
  return status || 'DRAFT';
}

export { RUNNING_STATUSES };
