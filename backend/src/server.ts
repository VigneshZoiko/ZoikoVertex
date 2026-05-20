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
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback, handleThreadsDeauthorize, handleThreadsDataDeletion, handleTwitterCallback, handleYoutubeCallback, handleTikTokCallback, disconnectAccount, getLinkedInPagesSession, saveLinkedInPages } from './domains/channels/socialController';
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
import { listMembers, listRequests, createRequest, updateRequest } from './domains/identity/teamController';
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
import { authenticate, provisionGuard } from './shared/authMiddleware';
import { requireRole } from './shared/permissionMiddleware';
import { registerExecutionListeners } from './domains/channels/executionService';

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
app.post('/api/v1/ai/generate', authenticate, generateContent);
app.post('/api/v1/ai/analyze-image', authenticate, analyzeImage);
app.post('/api/v1/qa/check', authenticate, performQualityCheck);
app.get('/api/v1/governance/exceptions', authenticate, listExceptions);
app.post('/api/v1/governance/exceptions/resolve', authenticate, resolveException);
const govGuard = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER');
app.get('/api/v1/governance/rules', authenticate, govGuard, listRules);
app.post('/api/v1/governance/rules', authenticate, govGuard, createRule);

// Protected Governance
app.post('/api/v1/governance/transition', authenticate, transitionStatus);
app.post('/api/v1/governance/submit', authenticate, submitIntent);
app.get('/api/v1/governance/intents', authenticate, listIntents);
app.get('/api/v1/governance/queue', authenticate, getQueue);
app.delete('/api/v1/governance/intents/:id', authenticate, deleteIntent);

// Protected Evidence Vault & Audit Trail
app.get('/api/v1/governance/audit/trail', authenticate, govGuard, getAuditTrail);
app.get('/api/v1/governance/audit/stats', authenticate, govGuard, getAuditStats);
app.get('/api/v1/governance/evidence/stats', authenticate, govGuard, getEvidenceStats);
app.get('/api/v1/governance/evidence/artifacts', authenticate, govGuard, getEvidenceArtifacts);
app.get('/api/v1/governance/evidence/artifacts/:id', authenticate, govGuard, getEvidenceArtifactDetail);
app.get('/api/v1/governance/evidence/holds', authenticate, govGuard, listLegalHolds);
app.post('/api/v1/governance/evidence/holds', authenticate, govGuard, applyLegalHold);
app.delete('/api/v1/governance/evidence/holds/:id', authenticate, govGuard, releaseLegalHold);
app.get('/api/v1/governance/evidence/packs', authenticate, govGuard, listEvidencePacks);
app.post('/api/v1/governance/evidence/packs', authenticate, govGuard, buildEvidencePack);
app.get('/api/v1/governance/evidence/packs/:id/download', authenticate, govGuard, downloadEvidencePack);

// Protected Risk & Compliance Command Center
app.get('/api/v1/governance/risk/pulse', authenticate, govGuard, getRiskPulse);
app.get('/api/v1/governance/risk/feed', authenticate, govGuard, getActiveRiskFeed);
app.get('/api/v1/governance/risk/gaps', authenticate, govGuard, getGovernanceGaps);
app.post('/api/v1/governance/risk/emergency-pause', authenticate, govGuard, triggerEmergencyPause);

// Forensic Analysis Engine
app.get('/api/v1/governance/forensic/summary', authenticate, govGuard, getForensicSummary);
app.get('/api/v1/governance/forensic/agents/:agentId', authenticate, govGuard, getAgentPerformance);
app.get('/api/v1/governance/collusion/metrics', authenticate, govGuard, getCollusionMetrics);

// Global Operations Telemetry
app.get('/api/v1/operations/telemetry', authenticate, getSystemTelemetry);
app.get('/api/v1/operations/logs', authenticate, getMissionLogs);

// Global Discovery
app.get('/api/v1/search', authenticate, performGlobalSearch);

// Protected Brand Standards & Content Governance
app.get('/api/v1/governance/brand/profiles', authenticate, govGuard, getBrandProfiles);
app.get('/api/v1/governance/brand/linguistic', authenticate, govGuard, getLinguisticProfile);
app.get('/api/v1/governance/brand/claims', authenticate, govGuard, getClaimsLedger);
app.post('/api/v1/governance/brand/rules', authenticate, govGuard, updateBrandRule);

// Public OAuth
app.get('/api/auth/facebook/callback', handleFacebookCallback);
app.get('/api/auth/linkedin/callback', handleLinkedInCallback);
app.get('/api/auth/pinterest/callback', handlePinterestCallback);
app.get('/api/auth/threads/callback', handleThreadsCallback);
app.post('/api/auth/threads/deauthorize', handleThreadsDeauthorize);
app.post('/api/auth/threads/data-deletion', handleThreadsDataDeletion);
app.get('/api/auth/twitter/callback', handleTwitterCallback);
app.get('/api/auth/youtube/callback', handleYoutubeCallback);
app.get('/api/auth/tiktok/callback', handleTikTokCallback);

// Protected Social/Account Routes
app.delete('/api/v1/accounts/:id', authenticate, disconnectAccount);
app.get('/api/v1/accounts/linkedin/pages', authenticate, getLinkedInPagesSession);
app.post('/api/v1/accounts/linkedin/pages', authenticate, saveLinkedInPages);

// Protected Scheduler Routes
app.post('/api/v1/scheduler/recommend', authenticate, getRecommendations);
app.get('/api/v1/scheduler/posts', authenticate, listScheduledPosts);
app.get('/api/v1/scheduler/posts/:id', authenticate, getScheduledPost);
app.post('/api/v1/scheduler/posts', authenticate, schedulePost);
app.put('/api/v1/scheduler/posts/:id', authenticate, updateScheduledPost);
app.delete('/api/v1/scheduler/posts/:id', authenticate, cancelScheduledPost);

// Protected Library Routes
app.get('/api/v1/library', authenticate, listLibrary);
app.post('/api/v1/library/upload', authenticate, addToLibrary);
app.delete('/api/v1/library/:id', authenticate, deleteFromLibrary);

// Protected User Routes
app.get('/api/v1/user/context', authenticate, getUserContext);

// Protected Account Routes
app.get('/api/v1/accounts', authenticate, listAccounts);

// Protected Team Routes
app.get('/api/v1/team/members', authenticate, listMembers);
app.get('/api/v1/team/requests', authenticate, listRequests);
app.post('/api/v1/team/requests', authenticate, createRequest);
app.put('/api/v1/team/requests/:id', authenticate, updateRequest);

// Protected Notification Routes
app.get('/api/v1/notifications', authenticate, listNotifications);
app.patch('/api/v1/notifications/:id/read', authenticate, markAsRead);
app.post('/api/v1/notifications/mark-all-read', authenticate, markAllRead);
app.delete('/api/v1/notifications', authenticate, clearNotifications);

// Protected Agent/Workflow Routes
// Autonomy Control Routes
app.get('/api/v1/autonomy/stats', authenticate, getAutonomyStats);
app.patch('/api/v1/autonomy/agents/:id/level', authenticate, updateAgentLevel);
app.post('/api/v1/autonomy/agents/:id/suspend', authenticate, suspendAgent);
app.get('/api/v1/autonomy/emergency-locks', authenticate, listEmergencyLocks);
app.post('/api/v1/autonomy/emergency-locks', authenticate, createEmergencyLock);
app.delete('/api/v1/autonomy/emergency-locks/:id', authenticate, liftEmergencyLock);
app.get('/api/v1/autonomy/hitl-rules', authenticate, listHITLRules);
app.post('/api/v1/autonomy/hitl-rules', authenticate, upsertHITLRule);
app.put('/api/v1/autonomy/hitl-rules/:id', authenticate, upsertHITLRule);
app.delete('/api/v1/autonomy/hitl-rules/:id', authenticate, deleteHITLRule);
app.get('/api/v1/autonomy/negative-knowledge', authenticate, listNegativeKnowledge);
app.post('/api/v1/autonomy/negative-knowledge', authenticate, createNegativeKnowledge);
app.delete('/api/v1/autonomy/negative-knowledge/:id', authenticate, deleteNegativeKnowledge);

app.get('/api/v1/agents', authenticate, listAgents);
app.get('/api/v1/agents/workflows', authenticate, listWorkflows);
app.get('/api/v1/agents/workflows/active', authenticate, getActiveOrchestrations);
app.get('/api/v1/agents/workflows/graph', authenticate, getWorkflowGraph);
app.get('/api/v1/agents/workflows/stats', authenticate, getWorkflowStats);
app.get('/api/v1/agents/workflows/escalations', authenticate, getEscalationPaths);
app.get('/api/v1/agents/:id', authenticate, getAgent);
app.post('/api/v1/agents', authenticate, registerAgent);
app.post('/api/v1/agents/:id/certify', authenticate, certifyAgent);
app.patch('/api/v1/agents/:id/autonomy', authenticate, updateAutonomy);

// Monitoring Routes
app.get('/api/v1/monitoring/usage', authenticate, getResourceUsage);
app.get('/api/v1/monitoring/models/performance/summary', authenticate, getPerformanceSummary);
app.get('/api/v1/monitoring/models/performance/trends', authenticate, getPerformanceTrends);
app.get('/api/v1/monitoring/models/performance/hallucinations', authenticate, getHallucinationFlags);
app.get('/api/v1/monitoring/models/performance/agents', authenticate, getAgentLeaderboard);

// SuperAdmin Routes (superadmin-only)
const superAdminGuard = requireRole('SUPERADMIN');
app.get('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.listAllOrganizations);
app.post('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.createOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/approve', authenticate, superAdminGuard, SuperAdminController.approveOrganization);
app.get('/api/v1/superadmin/stats', authenticate, superAdminGuard, SuperAdminController.getPlatformStats);
app.get('/api/v1/superadmin/tickets', authenticate, superAdminGuard, SupportController.listAllTickets);
app.patch('/api/v1/superadmin/tickets/:id', authenticate, superAdminGuard, SupportController.updateTicketStatus);

// Knowledge Base Routes
app.get('/api/v1/knowledge/bases', authenticate, KnowledgeController.listBases);
app.post('/api/v1/knowledge/bases', authenticate, KnowledgeController.createBase);
app.delete('/api/v1/knowledge/bases/:baseId', authenticate, KnowledgeController.deleteBase);
app.get('/api/v1/knowledge/bases/:baseId/entries', authenticate, KnowledgeController.listEntries);
app.post('/api/v1/knowledge/bases/:baseId/entries', authenticate, upload.single('file'), KnowledgeController.createEntry);
app.delete('/api/v1/knowledge/entries/:entryId', authenticate, KnowledgeController.deleteEntry);
app.get('/api/v1/knowledge/ai-context', authenticate, KnowledgeController.getAIContext);

app.get('/api/v1/integrations/health', authenticate, getIntegrationHealth);

// Approval Workflow Routes
app.post('/api/v1/approvals/submit', authenticate, submitForReview);
app.get('/api/v1/approvals/queue', authenticate, getApprovalQueue);
app.get('/api/v1/approvals/stats', authenticate, getApprovalStats);
app.post('/api/v1/approvals/items/:id/action', authenticate, takeApprovalAction);

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
