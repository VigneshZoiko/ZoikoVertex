import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logger } from '../../shared/logger';
import { v4 as uuidv4 } from 'uuid';

function isPrivateUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }
  const host = parsed.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(parsed.protocol)) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fd')) return true;
  const ip = host.startsWith('[') ? host.slice(1, -1) : host;
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function makeError(message: string, statusCode: number): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

/**
 * Resolves the Org ID associated with a given Workspace ID
 */
async function getOrgIdForWorkspace(workspaceId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('org_id')
    .eq('id', workspaceId)
    .single();
  if (error || !data) return null;
  return data.org_id;
}

export const listConnectors = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { data, error } = await supabaseAdmin
      .from('data_connectors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const createConnector = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { name, type, connection_config, mapping_config, sync_schedule } = req.body;

    if (!name?.trim()) return next(makeError('Connector name is required', 400));
    if (!['SUPABASE_TABLE', 'REST_API'].includes(type)) {
      return next(makeError('Invalid connector type. Choose SUPABASE_TABLE or REST_API.', 400));
    }

    if (type === 'REST_API' && !connection_config?.url) {
      return next(makeError('REST API URL is required', 400));
    }

    if (type === 'SUPABASE_TABLE' && !connection_config?.table_name) {
      return next(makeError('Supabase table name is required', 400));
    }

    // Verify target knowledge base exists
    const kbId = mapping_config?.kb_id;
    if (!kbId) return next(makeError('Target Knowledge Base is required', 400));

    // Retrieve organization ID for the user's workspace to verify ownership of the Knowledge Base
    const orgId = await getOrgIdForWorkspace(workspaceId);
    if (!orgId) {
      return next(makeError('Workspace organization not found', 404));
    }

    // SECURE: Verify that the target knowledge base belongs strictly to the user's Organization
    const { data: kb, error: kbErr } = await supabaseAdmin
      .from('knowledge_bases')
      .select('id')
      .eq('id', kbId)
      .eq('org_id', orgId)
      .single();

    if (kbErr || !kb) {
      return next(makeError('Selected Knowledge Base not found or permission denied.', 404));
    }

    const { data, error } = await supabaseAdmin
      .from('data_connectors')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        type,
        connection_config: connection_config || {},
        mapping_config: mapping_config || {},
        sync_schedule: sync_schedule || 'manual',
        status: 'ACTIVE',
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteConnector = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('data_connectors')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getSyncLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    // Verify connector belongs to workspace
    const { data: connector, error: connErr } = await supabaseAdmin
      .from('data_connectors')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (connErr || !connector) return next(makeError('Connector not found', 404));

    const { data, error } = await supabaseAdmin
      .from('connector_sync_logs')
      .select('*')
      .eq('connector_id', id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const triggerSync = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return next(makeError('No workspace context', 403));

  // Retrieve connector
  const { data: connector, error: connErr } = await supabaseAdmin
    .from('data_connectors')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (connErr || !connector) return next(makeError('Connector not found', 404));

  // Mark connector as SYNCING
  await supabaseAdmin
    .from('data_connectors')
    .update({ status: 'SYNCING' })
    .eq('id', id);

  // Run sync asynchronously to not block the Express HTTP request
  res.json({ success: true, message: 'Sync pipeline triggered successfully' });

  // Run ingestion pipeline
  const startTime = Date.now();
  const runLogs: string[] = [];
  let recordsSynced = 0;
  let syncStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
  let errorMessage: string | null = null;

  const logMessage = (msg: string) => {
    const timestamp = new Date().toISOString();
    runLogs.push(`[${timestamp}] ${msg}`);
    logger.info(`[Connector Sync ${id}]: ${msg}`);
  };

  try {
    logMessage(`Initializing sync pipeline for connector: "${connector.name}" (Type: ${connector.type})`);
    
    const kbId = connector.mapping_config.kb_id;
    const titleKey = connector.mapping_config.title_key || 'title';
    const contentKey = connector.mapping_config.content_key || 'content';
    const urlKey = connector.mapping_config.url_key;

    // Retrieve organization ID for the workspace
    const orgId = await getOrgIdForWorkspace(workspaceId);
    if (!orgId) {
      throw new Error('Workspace organization could not be resolved.');
    }

    // SECURE: Verify target KB belongs to the same org
    const { data: kb } = await supabaseAdmin
      .from('knowledge_bases')
      .select('name')
      .eq('id', kbId)
      .eq('org_id', orgId)
      .single();

    if (!kb) {
      throw new Error(`Target Knowledge Base (ID: ${kbId}) was not found or access is denied.`);
    }

    logMessage(`Target Knowledge Base confirmed: "${kb.name}"`);

    let sourceRecords: any[] = [];

    // --- PIPELINE 1: SUPABASE/POSTGRESQL TABLE SYNC ---
    if (connector.type === 'SUPABASE_TABLE') {
      const tableName = connector.connection_config.table_name;
      logMessage(`Scanning table public."${tableName}" with tenant isolation...`);
      
      // SECURE Whitelisted tables only + strictly filter by workspace context to keep Org data secure
      if (tableName === 'users') {
        // Step 1: get member user_ids scoped to this workspace
        const { data: members, error: memErr } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .limit(100);

        if (memErr) throw new Error(`Failed to query workspace members: ${memErr.message}`);
        const userIds = (members || []).map((m: any) => m.user_id);
        if (userIds.length === 0) throw new Error('No members found in this workspace');

        // Step 2: fetch user profiles for those IDs
        const { data: tableData, error: tableErr } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, designation, department')
          .in('id', userIds);

        if (tableErr) throw new Error(`Failed to query users: ${tableErr.message}`);
        sourceRecords = tableData || [];
      } 
      else if (tableName === 'agents') {
        const { data: tableData, error: tableErr } = await supabaseAdmin
          .from('agents')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(100);

        if (tableErr) throw new Error(`Failed to query table agents: ${tableErr.message}`);
        sourceRecords = tableData || [];
      } 
      else if (tableName === 'media_library') {
        const { data: tableData, error: tableErr } = await supabaseAdmin
          .from('media_library')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(100);

        if (tableErr) throw new Error(`Failed to query table media_library: ${tableErr.message}`);
        sourceRecords = tableData || [];
      } 
      else if (tableName === 'connected_accounts') {
        const { data: tableData, error: tableErr } = await supabaseAdmin
          .from('connected_accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(100);

        if (tableErr) throw new Error(`Failed to query table connected_accounts: ${tableErr.message}`);
        sourceRecords = tableData || [];
      } 
      else if (tableName === 'evidence_packs') {
        const { data: tableData, error: tableErr } = await supabaseAdmin
          .from('evidence_packs')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(100);

        if (tableErr) throw new Error(`Failed to query table evidence_packs: ${tableErr.message}`);
        sourceRecords = tableData || [];
      } 
      else {
        throw new Error(`Unauthorized table access: Table "${tableName}" is not allowed for synchronization.`);
      }

      logMessage(`Found ${sourceRecords.length} isolated records in table public."${tableName}"`);
    } 
    // --- PIPELINE 2: REST API JSON SYNC ---
    else if (connector.type === 'REST_API') {
      const url = connector.connection_config.url;
      if (isPrivateUrl(url)) {
        throw new Error('SSRF blocked: URL points to a private or loopback address');
      }
      logMessage(`Fetching JSON payload from external URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP fetch failed with status code ${response.status}: ${response.statusText}`);
      }

      const jsonPayload = await response.json();
      
      if (Array.isArray(jsonPayload)) {
        sourceRecords = jsonPayload;
      } else if (jsonPayload && typeof jsonPayload === 'object') {
        // If it's an object, search for the first key that contains a list
        const listKey = Object.keys(jsonPayload).find(k => Array.isArray(jsonPayload[k]));
        if (listKey) {
          sourceRecords = jsonPayload[listKey];
          logMessage(`Payload is object, extracted array from property "${listKey}"`);
        } else {
          sourceRecords = [jsonPayload];
        }
      }

      logMessage(`Fetched and parsed ${sourceRecords.length} records from API`);
    }

    // Ingest records into knowledge_entries
    logMessage('Ingesting data into Knowledge Base...');
    for (let index = 0; index < sourceRecords.length; index++) {
      const record = sourceRecords[index];
      
      // Extract values using keys
      const title = String(record[titleKey] || `Ingested Record #${index + 1}`);
      const content = String(record[contentKey] || JSON.stringify(record));
      const sourceUrl = urlKey ? String(record[urlKey] || '') : '';
      
      // Determine external ID to prevent duplicates
      const externalId = record.id || record.uuid || record.pk || `index_${index}`;

      // SECURE Check if this record is already ingested for this connector in the database (scoped strictly to target KB and connector)
      const { data: existing } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id')
        .eq('kb_id', kbId)
        .eq('metadata->>connector_id', id)
        .eq('metadata->>external_id', String(externalId))
        .maybeSingle();

      if (existing) {
        logMessage(`Skipping record "${title}" (External ID: ${externalId}) - already exists.`);
        continue;
      }

      // Insert new entry
      const { error: insertErr } = await supabaseAdmin
        .from('knowledge_entries')
        .insert({
          kb_id: kbId,
          title,
          content,
          source_url: sourceUrl || undefined,
          metadata: {
            connector_id: id,
            external_id: String(externalId),
            ingested_at: new Date().toISOString(),
          }
        });

      if (insertErr) {
        logMessage(`Error ingesting record "${title}": ${insertErr.message}`);
        continue;
      }

      recordsSynced++;
      logMessage(`Successfully ingested record #${recordsSynced}: "${title}"`);
    }

    logMessage(`Ingestion pipeline complete. Total new records synced: ${recordsSynced}`);

  } catch (err: any) {
    syncStatus = 'FAILED';
    errorMessage = err.message || 'Unknown pipeline failure';
    logMessage(`CRITICAL ERROR: ${errorMessage}`);
  } finally {
    const duration = Date.now() - startTime;

    // Log the sync execution details
    await supabaseAdmin
      .from('connector_sync_logs')
      .insert({
        connector_id: id,
        status: syncStatus,
        records_synced: recordsSynced,
        error_message: errorMessage,
        duration_ms: duration,
        logs: runLogs
      });

    // Update connector last run status
    await supabaseAdmin
      .from('data_connectors')
      .update({
        status: 'ACTIVE',
        last_sync_at: new Date().toISOString()
      })
      .eq('id', id);

    // Integration alert: notify the user who triggered the sync if it failed
    if (syncStatus === 'FAILED' && req.user?.id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          id: uuidv4(),
          user_id: req.user.id,
          title: `⚠️ Integration Alert: Sync Failed — "${connector.name}"`,
          body: `Data connector "${connector.name}" failed to sync. Error: ${errorMessage || 'Unknown error'}. Please check connector settings and retry.`,
          type: 'ERROR',
          category: 'SYSTEM',
          priority: 'HIGH',
          link: '/integrations/data',
          read: false,
        });
      } catch { /* non-blocking */ }
    }
  }
};
