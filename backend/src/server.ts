import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import os from 'os';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';

// Controllers
import { provisionUser } from './domains/identity/identityController';
import { generateContent, analyzeImage } from './domains/intelligence/intelligenceController';
import { transitionStatus, submitIntent, deleteIntent, listIntents, getQueue } from './domains/governance/governanceController';
import { 
  getAuditTrail, getAuditStats, 
  getEvidenceArtifacts, getEvidenceArtifactDetail, getEvidenceStats,
  applyLegalHold, listLegalHolds, releaseLegalHold,
  buildEvidencePack, listEvidencePacks, downloadEvidencePack
} from './domains/governance/evidenceController';
import { getRiskPulse, getActiveRiskFeed, getGovernanceGaps, triggerEmergencyPause } from './domains/governance/riskController';
import { getForensicSummary, getAgentPerformance } from './domains/governance/forensicController';
import { getCollusionMetrics } from './domains/governance/collusionController';
import { getBrandProfiles, getLinguisticProfile, getClaimsLedger, updateBrandRule } from './domains/governance/brandController';
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback, handleThreadsDeauthorize, handleThreadsDataDeletion, handleTwitterCallback, handleYoutubeCallback, disconnectAccount, getLinkedInPagesSession, saveLinkedInPages } from './domains/channels/socialController';
import { getRecommendations, schedulePost, cancelScheduledPost, listScheduledPosts, updateScheduledPost, getScheduledPost } from './domains/campaigns/schedulerController';
import { listLibrary, addToLibrary, deleteFromLibrary } from './domains/content/libraryController';
import { listAgents, getAgent, registerAgent, certifyAgent, updateAutonomy } from './domains/agents/agentController';
import {
  getAutonomyStats, updateAgentLevel, suspendAgent,
  createEmergencyLock, listEmergencyLocks, liftEmergencyLock,
  listHITLRules, upsertHITLRule, deleteHITLRule,
  listNegativeKnowledge, createNegativeKnowledge, deleteNegativeKnowledge,
} from './domains/agents/autonomyController';
import { SuperAdminController } from './domains/admin/superAdminController';
import { SupportController } from './domains/admin/supportController';
import { getUserContext } from './domains/identity/userController';
import { listAccounts } from './domains/channels/accountsController';
import { listMembers, listRequests, createRequest, updateRequest, deleteMember } from './domains/identity/teamController';
import { listUnits, createUnit, deleteUnit } from './domains/identity/unitsController';
import { performQualityCheck } from './domains/governance/qaController';
import { listExceptions, resolveException } from './domains/governance/exceptionController';
import { KnowledgeController } from './modules/knowledge/knowledgeController';
import { getResourceUsage } from './domains/monitoring/usageController';
import { getSystemTelemetry, getMissionLogs } from './domains/monitoring/telemetryController';
import { performGlobalSearch } from './domains/admin/globalSearchController';
import { getIntegrationHealth } from './domains/monitoring/integrationHealthController';
import { enterpriseSignup } from './domains/identity/enterpriseSignupController';

// New features from Naresh
import { listNotifications, markAsRead, markAllRead, clearNotifications } from './domains/identity/notificationController';
import { listRules, createRule } from './domains/governance/ruleController';
import { listWorkflows, getActiveOrchestrations, getWorkflowGraph, getWorkflowStats, getEscalationPaths } from './domains/agents/workflowController';
import {
  getPerformanceSummary,
  getPerformanceTrends,
  getHallucinationFlags,
  getAgentLeaderboard
} from './domains/monitoring/modelPerformanceController';

import { submitForReview, getApprovalQueue, getApprovalStats, takeApprovalAction } from './domains/decisions/approvalController';
import { authenticate, provisionGuard, scopeGuard } from './shared/authMiddleware';
import { integrationPlanGate, blockApiKeyUsers, planRateLimit } from './shared/planLimits';
import { requireRole } from './shared/permissionMiddleware';
import { registerExecutionListeners } from './domains/channels/executionService';
import {
  listApiKeys, createApiKey, revokeApiKey, deleteApiKey,
  listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getDeliveryLogs,
} from './domains/integrations/apiWebhookController';
import {
  listConnectors, createConnector, deleteConnector, getSyncLogs, triggerSync
} from './domains/integrations/dataConnectorController';

const upload = multer({ dest: os.tmpdir() });
const app = express();
const port = env.PORT;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ZoikoVertex Control Plane API is active.',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.post('/api/v1/auth/signup-enterprise', enterpriseSignup);
app.post('/api/v1/users/provision', provisionGuard, provisionUser);

// Protected Intelligence/AI
app.post('/api/v1/ai/generate', authenticate, planRateLimit('ai'), scopeGuard('write:content', '*'), generateContent);
app.post('/api/v1/ai/analyze-image', authenticate, planRateLimit('ai'), scopeGuard('write:content', '*'), analyzeImage);
app.post('/api/v1/qa/check', authenticate, planRateLimit('ai'), scopeGuard('write:content', '*'), performQualityCheck);
app.get('/api/v1/governance/exceptions', authenticate, scopeGuard('read:governance', '*'), listExceptions);
app.post('/api/v1/governance/exceptions/resolve', authenticate, scopeGuard('read:governance', '*'), resolveException);
const govGuard = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER');
app.get('/api/v1/governance/rules', authenticate, govGuard, scopeGuard('read:governance', '*'), listRules);
app.post('/api/v1/governance/rules', authenticate, govGuard, scopeGuard('read:governance', '*'), createRule);

// Protected Governance
app.post('/api/v1/governance/transition', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), transitionStatus);
app.post('/api/v1/governance/submit', authenticate, planRateLimit('general'), scopeGuard('write:content', 'write:publish', '*'), submitIntent);
app.get('/api/v1/governance/intents', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listIntents);
app.get('/api/v1/governance/queue', authenticate, planRateLimit('general'), scopeGuard('read:content', 'read:governance', '*'), getQueue);
app.delete('/api/v1/governance/intents/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), deleteIntent);

// Protected Evidence Vault & Audit Trail
app.get('/api/v1/governance/audit/trail', authenticate, govGuard, scopeGuard('read:governance', '*'), getAuditTrail);
app.get('/api/v1/governance/audit/stats', authenticate, govGuard, scopeGuard('read:governance', '*'), getAuditStats);
app.get('/api/v1/governance/evidence/stats', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceStats);
app.get('/api/v1/governance/evidence/artifacts', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceArtifacts);
app.get('/api/v1/governance/evidence/artifacts/:id', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceArtifactDetail);
app.get('/api/v1/governance/evidence/holds', authenticate, govGuard, scopeGuard('read:governance', '*'), listLegalHolds);
app.post('/api/v1/governance/evidence/holds', authenticate, govGuard, scopeGuard('read:governance', '*'), applyLegalHold);
app.delete('/api/v1/governance/evidence/holds/:id', authenticate, govGuard, scopeGuard('read:governance', '*'), releaseLegalHold);
app.get('/api/v1/governance/evidence/packs', authenticate, govGuard, scopeGuard('read:governance', '*'), listEvidencePacks);
app.post('/api/v1/governance/evidence/packs', authenticate, govGuard, scopeGuard('read:governance', '*'), buildEvidencePack);
app.get('/api/v1/governance/evidence/packs/:id/download', authenticate, govGuard, scopeGuard('read:governance', '*'), downloadEvidencePack);

// Protected Risk & Compliance Command Center
app.get('/api/v1/governance/risk/pulse', authenticate, govGuard, scopeGuard('read:governance', '*'), getRiskPulse);
app.get('/api/v1/governance/risk/feed', authenticate, govGuard, scopeGuard('read:governance', '*'), getActiveRiskFeed);
app.get('/api/v1/governance/risk/gaps', authenticate, govGuard, scopeGuard('read:governance', '*'), getGovernanceGaps);
app.post('/api/v1/governance/risk/emergency-pause', authenticate, govGuard, scopeGuard('read:governance', '*'), triggerEmergencyPause);

// Forensic Analysis Engine
app.get('/api/v1/governance/forensic/summary', authenticate, govGuard, scopeGuard('read:governance', '*'), getForensicSummary);
app.get('/api/v1/governance/forensic/agents/:agentId', authenticate, govGuard, scopeGuard('read:governance', '*'), getAgentPerformance);
app.get('/api/v1/governance/collusion/metrics', authenticate, govGuard, scopeGuard('read:governance', '*'), getCollusionMetrics);

// Global Operations Telemetry
app.get('/api/v1/operations/telemetry', authenticate, scopeGuard('read:analytics', '*'), getSystemTelemetry);
app.get('/api/v1/operations/logs', authenticate, scopeGuard('read:analytics', '*'), getMissionLogs);

// Global Discovery
app.get('/api/v1/search', authenticate, scopeGuard('read:content', '*'), performGlobalSearch);

// Protected Brand Standards & Content Governance
app.get('/api/v1/governance/brand/profiles', authenticate, govGuard, scopeGuard('read:governance', '*'), getBrandProfiles);
app.get('/api/v1/governance/brand/linguistic', authenticate, govGuard, scopeGuard('read:governance', '*'), getLinguisticProfile);
app.get('/api/v1/governance/brand/claims', authenticate, govGuard, scopeGuard('read:governance', '*'), getClaimsLedger);
app.post('/api/v1/governance/brand/rules', authenticate, govGuard, scopeGuard('read:governance', '*'), updateBrandRule);

// Public OAuth
app.get('/api/auth/facebook/callback', handleFacebookCallback);
app.get('/api/auth/linkedin/callback', handleLinkedInCallback);
app.get('/api/auth/pinterest/callback', handlePinterestCallback);
app.get('/api/auth/threads/callback', handleThreadsCallback);
app.post('/api/auth/threads/deauthorize', handleThreadsDeauthorize);
app.post('/api/auth/threads/data-deletion', handleThreadsDataDeletion);
app.get('/api/auth/twitter/callback', handleTwitterCallback);
app.get('/api/auth/youtube/callback', handleYoutubeCallback);
// Protected Social/Account Routes
app.delete('/api/v1/accounts/:id', authenticate, disconnectAccount);
app.get('/api/v1/accounts/linkedin/pages', authenticate, getLinkedInPagesSession);
app.post('/api/v1/accounts/linkedin/pages', authenticate, saveLinkedInPages);

// Protected Scheduler Routes
app.post('/api/v1/scheduler/recommend', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), getRecommendations);
app.get('/api/v1/scheduler/posts', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listScheduledPosts);
app.get('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), getScheduledPost);
app.post('/api/v1/scheduler/posts', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), schedulePost);
app.put('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), updateScheduledPost);
app.delete('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), cancelScheduledPost);

// Protected Library Routes
app.get('/api/v1/library', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listLibrary);
app.post('/api/v1/library/upload', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), addToLibrary);
app.delete('/api/v1/library/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), deleteFromLibrary);

// Protected User Routes
app.get('/api/v1/user/context', authenticate, getUserContext);

// Protected Account Routes
app.get('/api/v1/accounts', authenticate, listAccounts);

// Protected Team Routes
app.get('/api/v1/team/members', authenticate, listMembers);
app.delete('/api/v1/team/members/:id', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), deleteMember);
app.get('/api/v1/team/requests', authenticate, listRequests);
app.post('/api/v1/team/requests', authenticate, createRequest);
app.put('/api/v1/team/requests/:id', authenticate, updateRequest);

// Business units
app.get('/api/v1/units', authenticate, listUnits);
app.post('/api/v1/units', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), createUnit);
app.delete('/api/v1/units/:id', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), deleteUnit);

// Protected Notification Routes
app.get('/api/v1/notifications', authenticate, listNotifications);
app.patch('/api/v1/notifications/:id/read', authenticate, markAsRead);
app.post('/api/v1/notifications/mark-all-read', authenticate, markAllRead);
app.delete('/api/v1/notifications', authenticate, clearNotifications);

// Protected Agent/Workflow Routes
// Autonomy Control Routes
app.get('/api/v1/autonomy/stats', authenticate, scopeGuard('read:agents', '*'), getAutonomyStats);
app.patch('/api/v1/autonomy/agents/:id/level', authenticate, scopeGuard('write:agents', '*'), updateAgentLevel);
app.post('/api/v1/autonomy/agents/:id/suspend', authenticate, scopeGuard('write:agents', '*'), suspendAgent);
app.get('/api/v1/autonomy/emergency-locks', authenticate, scopeGuard('read:agents', '*'), listEmergencyLocks);
app.post('/api/v1/autonomy/emergency-locks', authenticate, scopeGuard('write:agents', '*'), createEmergencyLock);
app.delete('/api/v1/autonomy/emergency-locks/:id', authenticate, scopeGuard('write:agents', '*'), liftEmergencyLock);
app.get('/api/v1/autonomy/hitl-rules', authenticate, scopeGuard('read:agents', '*'), listHITLRules);
app.post('/api/v1/autonomy/hitl-rules', authenticate, scopeGuard('write:agents', '*'), upsertHITLRule);
app.put('/api/v1/autonomy/hitl-rules/:id', authenticate, scopeGuard('write:agents', '*'), upsertHITLRule);
app.delete('/api/v1/autonomy/hitl-rules/:id', authenticate, scopeGuard('write:agents', '*'), deleteHITLRule);
app.get('/api/v1/autonomy/negative-knowledge', authenticate, scopeGuard('read:agents', '*'), listNegativeKnowledge);
app.post('/api/v1/autonomy/negative-knowledge', authenticate, scopeGuard('write:agents', '*'), createNegativeKnowledge);
app.delete('/api/v1/autonomy/negative-knowledge/:id', authenticate, scopeGuard('write:agents', '*'), deleteNegativeKnowledge);

app.get('/api/v1/agents', authenticate, scopeGuard('read:agents', '*'), listAgents);
app.get('/api/v1/agents/workflows', authenticate, scopeGuard('read:agents', '*'), listWorkflows);
app.get('/api/v1/agents/workflows/active', authenticate, scopeGuard('read:agents', '*'), getActiveOrchestrations);
app.get('/api/v1/agents/workflows/graph', authenticate, scopeGuard('read:agents', '*'), getWorkflowGraph);
app.get('/api/v1/agents/workflows/stats', authenticate, scopeGuard('read:agents', '*'), getWorkflowStats);
app.get('/api/v1/agents/workflows/escalations', authenticate, scopeGuard('read:agents', '*'), getEscalationPaths);
app.get('/api/v1/agents/:id', authenticate, scopeGuard('read:agents', '*'), getAgent);
app.post('/api/v1/agents', authenticate, scopeGuard('write:agents', '*'), registerAgent);
app.post('/api/v1/agents/:id/certify', authenticate, scopeGuard('write:agents', '*'), certifyAgent);
app.patch('/api/v1/agents/:id/autonomy', authenticate, scopeGuard('write:agents', '*'), updateAutonomy);

// Monitoring Routes
app.get('/api/v1/monitoring/usage', authenticate, scopeGuard('read:analytics', '*'), getResourceUsage);
app.get('/api/v1/monitoring/models/performance/summary', authenticate, scopeGuard('read:analytics', '*'), getPerformanceSummary);
app.get('/api/v1/monitoring/models/performance/trends', authenticate, scopeGuard('read:analytics', '*'), getPerformanceTrends);
app.get('/api/v1/monitoring/models/performance/hallucinations', authenticate, scopeGuard('read:analytics', '*'), getHallucinationFlags);
app.get('/api/v1/monitoring/models/performance/agents', authenticate, scopeGuard('read:analytics', '*'), getAgentLeaderboard);

// SuperAdmin Routes (superadmin-only)
const superAdminGuard = requireRole('SUPERADMIN');
app.get('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.listAllOrganizations);
app.post('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.createOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/approve', authenticate, superAdminGuard, SuperAdminController.approveOrganization);
app.get('/api/v1/superadmin/stats', authenticate, superAdminGuard, SuperAdminController.getPlatformStats);
app.get('/api/v1/superadmin/tickets', authenticate, superAdminGuard, SupportController.listAllTickets);
app.patch('/api/v1/superadmin/tickets/:id', authenticate, superAdminGuard, SupportController.updateTicketStatus);

// Knowledge Base Routes
app.get('/api/v1/knowledge/bases', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listBases);
app.post('/api/v1/knowledge/bases', authenticate, scopeGuard('write:content', '*'), KnowledgeController.createBase);
app.delete('/api/v1/knowledge/bases/:baseId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteBase);
app.get('/api/v1/knowledge/bases/:baseId/entries', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listEntries);
app.post('/api/v1/knowledge/bases/:baseId/entries', authenticate, scopeGuard('write:content', '*'), upload.single('file'), KnowledgeController.createEntry);
app.put('/api/v1/knowledge/entries/:entryId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.updateEntry);
app.delete('/api/v1/knowledge/entries/:entryId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteEntry);
app.get('/api/v1/knowledge/ai-context', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getAIContext);

app.get('/api/v1/integrations/health', authenticate, scopeGuard('read:analytics', '*'), getIntegrationHealth);

// ─── Integration Management (DEVELOPER / ADMIN / WORKSPACE_OWNER, Growth+ plan, dashboard-only) ───
const integGuard = requireRole('DEVELOPER', 'WORKSPACE_OWNER', 'ADMIN');

// API Keys Routes
app.get('/api/v1/integrations/api-keys', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, listApiKeys);
app.post('/api/v1/integrations/api-keys', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, createApiKey);
app.patch('/api/v1/integrations/api-keys/:id/revoke', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, revokeApiKey);
app.delete('/api/v1/integrations/api-keys/:id', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, deleteApiKey);

// Webhook Routes
app.get('/api/v1/integrations/webhooks', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, listWebhooks);
app.post('/api/v1/integrations/webhooks', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, createWebhook);
app.patch('/api/v1/integrations/webhooks/:id', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, updateWebhook);
app.delete('/api/v1/integrations/webhooks/:id', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, deleteWebhook);
app.post('/api/v1/integrations/webhooks/:id/test', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, testWebhook);
app.get('/api/v1/integrations/webhooks/:id/logs', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, getDeliveryLogs);

// Data Connectors Routes
app.get('/api/v1/integrations/connectors', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, listConnectors);
app.post('/api/v1/integrations/connectors', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, createConnector);
app.delete('/api/v1/integrations/connectors/:id', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, deleteConnector);
app.post('/api/v1/integrations/connectors/:id/sync', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, triggerSync);
app.get('/api/v1/integrations/connectors/:id/logs', authenticate, blockApiKeyUsers, integrationPlanGate, integGuard, getSyncLogs);

// Approval Workflow Routes
app.post('/api/v1/approvals/submit', authenticate, scopeGuard('write:publish', '*'), submitForReview);
app.get('/api/v1/approvals/queue', authenticate, scopeGuard('read:governance', '*'), getApprovalQueue);
app.get('/api/v1/approvals/stats', authenticate, scopeGuard('read:governance', '*'), getApprovalStats);
app.post('/api/v1/approvals/items/:id/action', authenticate, scopeGuard('write:publish', '*'), takeApprovalAction);

// Support Routes
app.post('/api/v1/support/tickets', authenticate, SupportController.submitTicket);

// Global Error Handler
app.use(errorHandler);

import { initWorker } from './workers/schedulerWorker';

// ─── Start Server ─────────────────────────────────────────────────────────────
try {
  registerExecutionListeners();
  const server = app.listen(port, () => {
    logger.info(`[server]: ZoikoVertex backend running in ${env.NODE_ENV} mode at http://localhost:${port}`);
    // Start background workers
    initWorker();
  });

  server.on('error', (err: Error & { code?: string }) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[server] Error: Port ${port} is already in use.`);
    } else {
      logger.error({ err }, '[server] Error');
    }
    process.exit(1);
  });
} catch (startErr) {
  logger.error({ startErr }, '[server] Failed to start');
}
