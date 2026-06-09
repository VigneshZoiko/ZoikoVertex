import { logger } from './logger';

export interface SecOpsAlertEvent {
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  source: string;
  details?: Record<string, unknown>;
}

export function alertSecOpsAuditFailure(event: SecOpsAlertEvent): void {
  logger.error(
    {
      alert_type: event.alert_type,
      severity: event.severity,
      source: event.source,
      details: event.details,
      secops_alert: true,
    },
    `[SECOPS] ${event.message}`,
  );
}
