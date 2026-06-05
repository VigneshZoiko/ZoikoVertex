/**
 * metaPublishReport.ts
 *
 * Builds a step-by-step audit report for every Meta campaign publish attempt.
 * Records what we sent, what Meta returned, and any errors at each stage.
 * Written to disk at:  backend/publish-reports/{campaignId}_{timestamp}.json
 */

import * as fs   from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StepStatus = 'ok' | 'error' | 'skipped' | 'partial' | 'warn';

export interface PublishStep {
  step:       string;
  status:     StepStatus;
  timestamp:  string;
  sent?:      Record<string, any>;
  received?:  Record<string, any>;
  error?:     string;
  meta_id?:   string;
  notes?:     string;
}

export interface PublishReport {
  campaign_id:   string;
  workspace_id:  string;
  published_at:  string;
  outcome:       'SUCCESS' | 'FAILED' | 'PARTIAL';
  final_error?:  string;
  report_file?:  string;
  steps:         PublishStep[];
  meta_ids: {
    campaign_id?:  string;
    adset_id?:     string;
    creative_ids?: string[];
    ad_ids?:       string[];
    first_creative_id?: string;
    first_ad_id?:  string;
  };
  summary: {
    total_steps: number;
    ok:          number;
    errors:      number;
    skipped:     number;
  };
}

// ── Reporter class ─────────────────────────────────────────────────────────────

export class PublishReporter {
  private report: PublishReport;
  private readonly reportDir: string;

  constructor(campaignId: string, workspaceId: string) {
    // Resolve to the project's publish-reports dir regardless of cwd
    this.reportDir = path.resolve(__dirname, '../../../../publish-reports');

    this.report = {
      campaign_id:  campaignId,
      workspace_id: workspaceId,
      published_at: new Date().toISOString(),
      outcome:      'FAILED',
      steps:        [],
      meta_ids:     { creative_ids: [], ad_ids: [] },
      summary:      { total_steps: 0, ok: 0, errors: 0, skipped: 0 },
    };
  }

  // Add a single step to the report.
  // `sent`  — the payload we dispatched (token is always stripped)
  // `received` — the raw JSON Meta returned
  addStep(step: Omit<PublishStep, 'timestamp'>): void {
    this.report.steps.push({
      ...step,
      timestamp: new Date().toISOString(),
    });
  }

  // Update the Meta IDs section as they become known
  setMetaIds(ids: Partial<PublishReport['meta_ids']>): void {
    Object.assign(this.report.meta_ids, ids);
    if (ids.first_creative_id && this.report.meta_ids.creative_ids) {
      if (!this.report.meta_ids.creative_ids.includes(ids.first_creative_id)) {
        this.report.meta_ids.creative_ids.push(ids.first_creative_id);
      }
    }
    if (ids.ad_ids) {
      this.report.meta_ids.ad_ids = [
        ...(this.report.meta_ids.ad_ids || []),
        ...ids.ad_ids.filter(id => !this.report.meta_ids.ad_ids?.includes(id)),
      ];
    }
  }

  pushAdId(adId: string): void {
    this.report.meta_ids.ad_ids ??= [];
    if (!this.report.meta_ids.ad_ids.includes(adId)) {
      this.report.meta_ids.ad_ids.push(adId);
    }
  }

  pushCreativeId(creativeId: string): void {
    this.report.meta_ids.creative_ids ??= [];
    if (!this.report.meta_ids.creative_ids.includes(creativeId)) {
      this.report.meta_ids.creative_ids.push(creativeId);
    }
  }

  // Call at the very end to write the file and freeze the report
  finalize(outcome: 'SUCCESS' | 'FAILED' | 'PARTIAL', finalError?: string): PublishReport {
    this.report.outcome     = outcome;
    if (finalError) this.report.final_error = finalError;

    this.report.summary = {
      total_steps: this.report.steps.length,
      ok:          this.report.steps.filter(s => s.status === 'ok').length,
      errors:      this.report.steps.filter(s => s.status === 'error').length,
      skipped:     this.report.steps.filter(s => s.status === 'skipped').length,
    };

    // Write to disk — best-effort, never throws
    try {
      fs.mkdirSync(this.reportDir, { recursive: true });
      const ts       = this.report.published_at.replace(/[:.]/g, '-');
      const filename = `${this.report.campaign_id}_${ts}.json`;
      const filepath = path.join(this.reportDir, filename);
      this.report.report_file = filepath;
      fs.writeFileSync(filepath, JSON.stringify(this.report, null, 2), 'utf8');
    } catch {
      // silently skip — a broken report write must never fail the publish
    }

    return this.report;
  }

  getReport(): PublishReport {
    return this.report;
  }
}
