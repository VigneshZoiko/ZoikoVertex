import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface JurisdictionRule {
  jurisdiction: string;
  data_residency: string;
  allowed_countries: string[];
  restricted_countries: string[];
  retention_days: number;
  require_consent: boolean;
}

const JURISDICTION_RULES: Record<string, JurisdictionRule> = {
  US: {
    jurisdiction: 'US',
    data_residency: 'us-east-1',
    allowed_countries: ['US', 'CA'],
    restricted_countries: ['CN', 'RU', 'IR', 'KP', 'SY'],
    retention_days: 2555,
    require_consent: false,
  },
  EU: {
    jurisdiction: 'EU',
    data_residency: 'eu-west-1',
    allowed_countries: ['DE', 'FR', 'UK', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'FI', 'AT', 'IE', 'PL', 'PT', 'GR', 'CZ', 'RO', 'HU'],
    restricted_countries: ['CN', 'RU', 'IR', 'KP', 'SY'],
    retention_days: 1825,
    require_consent: true,
  },
  UK: {
    jurisdiction: 'UK',
    data_residency: 'eu-west-2',
    allowed_countries: ['GB', 'US', 'CA', 'AU', 'NZ'],
    restricted_countries: ['CN', 'RU', 'IR', 'KP', 'SY'],
    retention_days: 1825,
    require_consent: true,
  },
  DEFAULT: {
    jurisdiction: 'DEFAULT',
    data_residency: 'auto',
    allowed_countries: [],
    restricted_countries: ['CN', 'RU', 'IR', 'KP', 'SY'],
    retention_days: 365,
    require_consent: false,
  },
};

export class KnowledgeMultiRegionService {
  static getJurisdictionRule(jurisdiction: string): JurisdictionRule {
    return JURISDICTION_RULES[jurisdiction] || JURISDICTION_RULES.DEFAULT;
  }

  static async enforceJurisdiction(sourceId: string): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = [];

    try {
      const { data: source } = await supabaseAdmin
        .from('knowledge_sources')
        .select('jurisdiction, locale, risk_tier, sensitivity_level, expiry_date')
        .eq('id', sourceId)
        .single();

      if (!source) return { compliant: true, violations: [] };

      const rule = this.getJurisdictionRule(source.jurisdiction || 'DEFAULT');

      if (source.risk_tier === 'CRITICAL' && source.jurisdiction !== 'US' && source.jurisdiction !== 'EU') {
        violations.push(`CRITICAL risk tier requires US or EU jurisdiction, got ${source.jurisdiction || 'DEFAULT'}`);
      }

      if (source.sensitivity_level === 'RESTRICTED' && !rule.require_consent) {
        violations.push(`RESTRICTED sensitivity requires consent, but ${rule.jurisdiction} jurisdiction does not require it`);
      }

      if (rule.retention_days && source.expiry_date) {
        const maxExpiry = new Date(Date.now() + rule.retention_days * 86400000).toISOString();
        if (source.expiry_date > maxExpiry) {
          violations.push(`Expiry date exceeds ${rule.jurisdiction} maximum retention of ${rule.retention_days} days`);
        }
      }

      return { compliant: violations.length === 0, violations };
    } catch (error) {
      logger.error({ error, sourceId }, 'Jurisdiction enforcement check failed');
      return { compliant: true, violations: ['Error checking jurisdiction'] };
    }
  }

  static async resolveDataResidency(workspaceId: string, preferredRegion?: string): Promise<string> {
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('jurisdiction, data_residency')
      .eq('id', workspaceId)
      .single();

    if (!workspace) return preferredRegion || 'auto';

    if (workspace.data_residency && workspace.data_residency !== 'auto') {
      return workspace.data_residency;
    }

    if (workspace.jurisdiction) {
      const rule = this.getJurisdictionRule(workspace.jurisdiction);
      return rule.data_residency;
    }

    return preferredRegion || 'auto';
  }

  static async getSupportedJurisdictions(): Promise<Array<{ code: string; name: string; data_residency: string }>> {
    return [
      { code: 'US', name: 'United States', data_residency: 'us-east-1' },
      { code: 'EU', name: 'European Union', data_residency: 'eu-west-1' },
      { code: 'UK', name: 'United Kingdom', data_residency: 'eu-west-2' },
      { code: 'AU', name: 'Australia', data_residency: 'ap-southeast-2' },
      { code: 'CA', name: 'Canada', data_residency: 'ca-central-1' },
    ];
  }

  static async filterByJurisdiction(
    chunks: Array<{ source_id: string; jurisdiction?: string }>,
    userJurisdiction: string,
  ): Promise<Array<{ source_id: string; jurisdiction?: string }>> {
    const rule = this.getJurisdictionRule(userJurisdiction);
    if (rule.restricted_countries.length === 0) return chunks;

    return chunks.filter(chunk => {
      if (!chunk.jurisdiction) return true;
      return !rule.restricted_countries.includes(chunk.jurisdiction);
    });
  }
}
