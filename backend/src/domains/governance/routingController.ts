import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import {
  routeItem,
  executeWorkflowChain,
  getRoutingHistory,
  getWorkflowChains,
  RoutingSourceModule,
  RoutingTargetModule,
} from '../../services/workflowRouting.service';

export async function routeToModule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const { source_module, source_entity_id, target_module, title, item_type, risk_level, metadata } = req.body;
    if (!source_module || !source_entity_id || !target_module || !title) {
      return res.status(400).json({ error: 'source_module, source_entity_id, target_module, and title are required' });
    }

    const result = await routeItem({
      source_module,
      source_entity_id,
      target_module,
      title,
      item_type,
      risk_level,
      routed_by: userId,
      workspace_id: workspaceId,
      metadata,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function executeChain(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const { chain_id, source_module, source_entity_id, title, item_type, risk_level, metadata } = req.body;
    if (!chain_id || !source_module || !source_entity_id || !title) {
      return res.status(400).json({ error: 'chain_id, source_module, source_entity_id, and title are required' });
    }

    const result = await executeWorkflowChain({
      chain_id,
      source_module,
      source_entity_id,
      title,
      item_type,
      risk_level,
      routed_by: userId,
      workspace_id: workspaceId,
      metadata,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listRoutingHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const { source_module, source_entity_id, target_module, target_item_id, limit } = req.query as Record<string, string | undefined>;

    const result = await getRoutingHistory({
      workspace_id: workspaceId,
      source_module: source_module as RoutingSourceModule | undefined,
      source_entity_id,
      target_module: target_module as RoutingTargetModule | undefined,
      target_item_id,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: result.trails, total: result.total });
  } catch (error) { next(error); }
}

export async function listWorkflowChains(_req: AuthRequest, res: Response, _next: NextFunction) {
  res.json({ success: true, data: getWorkflowChains() });
}
