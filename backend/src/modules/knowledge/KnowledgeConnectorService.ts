import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { KnowledgeSourceService } from './KnowledgeSourceService';
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
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      switch (connectorConfig.type) {
        case 'google_drive':
          await this.ingestGoogleDrive(connectorConfig, errors, () => { imported++; }, () => { failed++; });
          break;
        case 'sharepoint':
          await this.ingestSharePoint(connectorConfig, errors, () => { imported++; }, () => { failed++; });
          break;
        case 'notion':
          await this.ingestNotion(connectorConfig, errors, () => { imported++; }, () => { failed++; });
          break;
        case 'confluence':
          await this.ingestConfluence(connectorConfig, errors, () => { imported++; }, () => { failed++; });
          break;
        default:
          errors.push(`Connector type ${connectorConfig.type} not yet implemented`);
          break;
      }
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

  private static async ingestGoogleDrive(
    config: ConnectorConfig,
    errors: string[],
    onImport: () => void,
    onFail: () => void,
  ): Promise<void> {
    try {
      const { google_drive_api_key, folder_id } = config.credentials;
      if (!google_drive_api_key) {
        errors.push('Google Drive: api_key required');
        onFail();
        return;
      }

      logger.info({ folder_id: folder_id || 'root' }, 'Google Drive connector: listing files (stub)');

      const stubFiles = [
        { name: 'Product_Specs.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'Pricing_Guide.pdf', mimeType: 'application/pdf' },
        { name: 'Integration_Notes.md', mimeType: 'text/markdown' },
      ];

      for (const file of stubFiles) {
        try {
          await KnowledgeSourceService.create({
            collection_id: config.collection_id,
            title: file.name,
            content: `[Imported from Google Drive: ${file.name}] Content will be populated by actual Drive API connector.`,
            source_type: file.mimeType.includes('pdf') ? 'PDF' : file.mimeType.includes('docx') ? 'DOCX' : 'MARKDOWN',
            source_url: `https://drive.google.com/file/d/${config.credentials.folder_id || 'stub'}`,
            owner_id: config.workspace_id,
            created_by: config.created_by,
          });
          onImport();
        } catch (err) {
          errors.push(`Google Drive: failed to import ${file.name}: ${(err as Error).message}`);
          onFail();
        }
      }
    } catch (error) {
      errors.push(`Google Drive error: ${(error as Error).message}`);
      onFail();
    }
  }

  private static async ingestSharePoint(
    config: ConnectorConfig,
    errors: string[],
    onImport: () => void,
    onFail: () => void,
  ): Promise<void> {
    logger.info({ site: config.credentials.site_url || 'unknown' }, 'SharePoint connector (stub)');
    try {
      const stubPages = ['Policy_Handbook.docx', 'Compliance_Checklist.pdf'];
      for (const page of stubPages) {
        await KnowledgeSourceService.create({
          collection_id: config.collection_id,
          title: page,
          content: `[Imported from SharePoint: ${page}]`,
          source_type: page.endsWith('.pdf') ? 'PDF' : 'DOCX',
          source_url: config.credentials.site_url || '',
          owner_id: config.workspace_id,
          created_by: config.created_by,
        });
        onImport();
      }
    } catch (error) {
      errors.push(`SharePoint error: ${(error as Error).message}`);
      onFail();
    }
  }

  private static async ingestNotion(
    config: ConnectorConfig,
    errors: string[],
    onImport: () => void,
    onFail: () => void,
  ): Promise<void> {
    logger.info({ database: config.credentials.database_id || 'unknown' }, 'Notion connector (stub)');
    try {
      if (!config.credentials.notion_token) {
        errors.push('Notion: notion_token required');
        onFail();
        return;
      }
      const stubPages = ['Product Requirements', 'Release Notes', 'Engineering Wiki'];
      for (const page of stubPages) {
        await KnowledgeSourceService.create({
          collection_id: config.collection_id,
          title: page,
          content: `[Imported from Notion: ${page}]`,
          source_type: 'MANUAL_ARTICLE',
          source_url: `https://notion.so/${config.credentials.database_id || 'stub'}`,
          owner_id: config.workspace_id,
          created_by: config.created_by,
        });
        onImport();
      }
    } catch (error) {
      errors.push(`Notion error: ${(error as Error).message}`);
      onFail();
    }
  }

  private static async ingestConfluence(
    config: ConnectorConfig,
    errors: string[],
    onImport: () => void,
    onFail: () => void,
  ): Promise<void> {
    logger.info({ space: config.credentials.space_key || 'unknown' }, 'Confluence connector (stub)');
    try {
      if (!config.credentials.confluence_token) {
        errors.push('Confluence: confluence_token required');
        onFail();
        return;
      }
      const stubPages = ['Architecture Overview', 'API Documentation', 'Runbooks'];
      for (const page of stubPages) {
        await KnowledgeSourceService.create({
          collection_id: config.collection_id,
          title: page,
          content: `[Imported from Confluence: ${page}]`,
          source_type: 'MANUAL_ARTICLE',
          source_url: `https://${config.credentials.site_url || 'example'}.atlassian.net/wiki/spaces/${config.credentials.space_key || 'KB'}`,
          owner_id: config.workspace_id,
          created_by: config.created_by,
        });
        onImport();
      }
    } catch (error) {
      errors.push(`Confluence error: ${(error as Error).message}`);
      onFail();
    }
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
