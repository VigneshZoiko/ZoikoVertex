import { PromptEvidenceService, PromptEvidenceReceipt } from './PromptEvidenceService';
import { PromptAuditService } from './PromptAuditService';
import { logToDatabase } from '../../shared/databaseLogger';

export type GuardCriticality = 'critical' | 'high' | 'standard';

export interface GuardOptions {
  operation: string;
  workspaceId: string;
  promptId?: string;
  promptVersionId?: string;
  actorId?: string;
  criticality: GuardCriticality;
  throwOnEvidenceFailure?: boolean;
  throwOnAuditFailure?: boolean;
}

export interface GuardResult {
  success: boolean;
  evidenceReceipt: PromptEvidenceReceipt | null;
  auditRecord: any | null;
  evidenceFailed: boolean;
  auditFailed: boolean;
}

export class FailClosedGuard {
  static async guardEvidenceWrite(
    eventType: string,
    payload: Record<string, unknown>,
    options: GuardOptions,
  ): Promise<GuardResult> {
    let evidenceReceipt: PromptEvidenceReceipt | null = null;
    let evidenceFailed = false;
    let auditRecord: any | null = null;
    let auditFailed = false;

    const shouldEnforceEvidence = options.throwOnEvidenceFailure !== false;
    if (shouldEnforceEvidence) {
      try {
        evidenceReceipt = await PromptEvidenceService.record({
          event_type: eventType,
          prompt_id: options.promptId,
          prompt_version_id: options.promptVersionId,
          workspace_id: options.workspaceId,
          actor_id: options.actorId,
          reason: String(payload.reason || ''),
          payload,
        });
        if (!evidenceReceipt && options.criticality === 'critical') {
          evidenceFailed = true;
          throw new Error(
            `CRITICAL: Evidence write failed for ${options.operation} — governance action BLOCKED. ` +
            `Event: ${eventType}, Workspace: ${options.workspaceId}`,
          );
        }
      } catch (err) {
        evidenceFailed = true;
        throw err;
      }
    }

    const shouldEnforceAudit = options.throwOnAuditFailure !== false;
    if (shouldEnforceAudit) {
      try {
        auditRecord = await PromptAuditService.record({
          event_type: eventType,
          workspace_id: options.workspaceId,
          prompt_id: options.promptId,
          version_id: options.promptVersionId,
          actor_id: options.actorId,
          reason: String(payload.reason || ''),
          after_state: payload,
          risk_level: payload.risk_level as string | undefined,
        });
        if (!auditRecord && options.criticality === 'critical') {
          auditFailed = true;
          throw new Error(
            `CRITICAL: Audit write failed for ${options.operation} — governance action BLOCKED. ` +
            `Event: ${eventType}, Workspace: ${options.workspaceId}`,
          );
        }
      } catch (err) {
        auditFailed = true;
        throw err;
      }
    }

    if (evidenceFailed || auditFailed) {
      await logToDatabase('error', 'prompt-governance', 'fail_closed_guard.triggered', {
        operation: options.operation,
        event_type: eventType,
        workspace_id: options.workspaceId,
        prompt_id: options.promptId,
        evidence_failed: evidenceFailed,
        audit_failed: auditFailed,
        criticality: options.criticality,
      });
    }

    return {
      success: !evidenceFailed && !auditFailed,
      evidenceReceipt,
      auditRecord,
      evidenceFailed,
      auditFailed,
    };
  }

  static async guardDeployment(
    options: GuardOptions & { eventType: string; payload: Record<string, unknown> },
  ): Promise<void> {
    const result = await this.guardEvidenceWrite(options.eventType, options.payload, {
      ...options,
      criticality: 'critical',
      throwOnEvidenceFailure: true,
      throwOnAuditFailure: true,
    });

    if (!result.success) {
      throw new Error(
        `Deployment BLOCKED: governance write failed for ${options.operation}. ` +
        `Evidence: ${result.evidenceFailed ? 'FAILED' : 'OK'}, ` +
        `Audit: ${result.auditFailed ? 'FAILED' : 'OK'}`,
      );
    }
  }

  static async guardApproval(
    options: GuardOptions & { eventType: string; payload: Record<string, unknown> },
  ): Promise<void> {
    const result = await this.guardEvidenceWrite(options.eventType, options.payload, {
      ...options,
      criticality: 'high',
      throwOnEvidenceFailure: true,
      throwOnAuditFailure: true,
    });

    if (!result.success) {
      throw new Error(
        `Approval BLOCKED: governance write failed for ${options.operation}. ` +
        `Evidence: ${result.evidenceFailed ? 'FAILED' : 'OK'}, ` +
        `Audit: ${result.auditFailed ? 'FAILED' : 'OK'}`,
      );
    }
  }
}
