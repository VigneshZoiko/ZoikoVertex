import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';

type ConnectorType = 'google_drive' | 'sharepoint' | 'notion' | 'confluence' | 'dam' | 'crm';

interface ConnectorConfig {
  type: ConnectorType;
  workspace_id: string;
  collection_id: string;
  created_by: string;
  credentials: Record<string, string>;
  sync_config: {
    interval_minutes?: number;
    folders?: string[];
    pages?: string[];
    databases?: string[];
    auto_ingest?: boolean;
  };
}

export class KnowledgeConnectorService {
  static async ingestFromConnector(
    connectorConfig: ConnectorConfig,
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const imported = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      errors.push(`Connector type ${connectorConfig.type} not yet implemented`);
      failed++;
    } catch (error) {
      logger.error({ error, type: connectorConfig.type }, 'Connector ingestion failed');
      errors.push(`Ingestion error: ${(error as Error).message}`);
    }

    internalEventBus.emit('knowledge.connector_ingested', {
      workspace_id: connectorConfig.workspace_id,
      collection_id: connectorConfig.collection_id,
      connector_type: connectorConfig.type,
      imported,
      failed,
    });

    return { imported, failed, errors };
  }

  static async getConnectorStatus(workspaceId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('type', ['google_drive', 'sharepoint', 'notion', 'confluence']);
    return data || [];
  }
}
