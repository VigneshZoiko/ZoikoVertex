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
  buildEvidencePack, listEvidencePacks
} from './domains/governance/evidenceController';
import { getRiskPulse, getActiveRiskFeed, getGovernanceGaps, triggerEmergencyPause } from './domains/governance/riskController';
import { getForensicSummary, getAgentPerformance } from './domains/governance/forensicController';
import { getBrandProfiles, getLinguisticProfile, getClaimsLedger, updateBrandRule } from './domains/governance/brandController';
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback, handleThreadsDeauthorize, handleThreadsDataDeletion, handleTwitterCallback, handleYoutubeCallback, handleTikTokCallback, disconnectAccount, getLinkedInPagesSession, saveLinkedInPages } from './domains/channels/socialController';
import { getRecommendations, schedulePost, cancelScheduledPost, listScheduledPosts, updateScheduledPost, getScheduledPost } from './domains/campaigns/schedulerController';
import { listLibrary, addToLibrary, deleteFromLibrary } from './domains/content/libraryController';
import {
  listAgents, getAgent, registerAgent, certifyAgent, updateAutonomy,
  getAgentCapabilities, getAgentVersions, rollbackAgent,
  runAgentSandbox, getAgentTestHistory,
  getAgentLinkedResources, updateLinkedResources,
  getChecklist, getAgentEvidence, getEvidence,
  cloneAgent, deployAgent, pauseAgent, resumeAgent, retireAgent, requestApproval,
  approveAgent, rejectAgentApproval, updateRuntimeControls,
  updateAgent, listAgentTemplates, getAgentTemplate, createAgentFromTemplate,
  getAgentProfile, getAgentGovernanceGates,
  getAgentPermissionSets, updateAgentPermissionSets,
  runAgentSafetyChecks, getAgentSafetyResults,
  runAgentPlatformChecks, getAgentPlatformCheckHistory,
  getAgentIncidents, createAgentIncident, resolveAgentIncident
} from './domains/agents/agentController';
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
import {
  KnowledgeController,
} from './modules/knowledge/knowledgeController';
import { PromptController } from './modules/prompts/promptController';
import { getResourceUsage } from './domains/monitoring/usageController';
import { getSystemTelemetry, getMissionLogs } from './domains/monitoring/telemetryController';
import { performGlobalSearch } from './domains/admin/globalSearchController';
import { getIntegrationHealth } from './domains/monitoring/integrationHealthController';
import { enterpriseSignup } from './domains/identity/enterpriseSignupController';

// New features from Naresh
import { listNotifications, markAsRead, markAllRead, clearNotifications } from './domains/identity/notificationController';
import { listRules, createRule } from './domains/governance/ruleController';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  listVersions,
  createDraftVersion,
  submitForApproval,
  approveVersion,
  rejectVersion,
  activateVersion,
  rollbackVersion,
  pauseWorkflow,
  retireWorkflow,
  getWorkflowGraph,
  getWorkflowGraphGeneral,
  validateReadiness,
  getActiveOrchestrations,
  getWorkflowStats,
  getWorkflowAnalytics,
  getControlStrip,
  getEscalationPaths,
  startWorkflowInstance,
  listInstances,
  getInstance,
  transitionInstance,
  getInstanceStepRuns,
  getApprovals,
  recordApproval,
  getApprovalStats,
  runSimulation,
  listSimulations,
  getDependencies,
  getWorkflowEvidence,
  createEvidence
} from './domains/agents/workflowController';
import {
  getPerformanceSummary,
  getPerformanceTrends,
  getHallucinationFlags,
  getAgentLeaderboard
} from './domains/monitoring/modelPerformanceController';

import { submitForReview, getApprovalQueue, getApprovalStats as getApprovalStatsLegacy, takeApprovalAction } from './domains/decisions/approvalController';
import { authenticate, provisionGuard } from './shared/authMiddleware';
import { requireRole } from './shared/permissionMiddleware';
import { registerExecutionListeners } from './domains/channels/executionService';
import {
  listAgentRuns,
  getAgentRun,
  getRunTimeline,
  pauseRun,
  resumeRun,
  stopRun,
  retryRun,
  quarantineRun,
  listQueues,
  assignQueueItem,
  createIncident,
  listIncidents,
  resolveIncident,
  getOperationsStats,
  getRunEvidence,
  exportEvidence,
  emergencyPause,
  escalateRun,
  restrictedMode,
  runPolicyCheck,
  getPolicyResults,
  getRuntimeControlLog,
  getAnalyticsMetrics,
  createEvidenceBundle,
  lockEvidenceBundle,
  listEvidenceBundles
} from './domains/agents/operationsController';

const upload = multer({ dest: os.tmpdir() });
const app = express();
const port = env.PORT;

// Middleware
app.use(helmet());
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

// Protected Risk & Compliance Command Center
app.get('/api/v1/governance/risk/pulse', authenticate, govGuard, getRiskPulse);
app.get('/api/v1/governance/risk/feed', authenticate, govGuard, getActiveRiskFeed);
app.get('/api/v1/governance/risk/gaps', authenticate, govGuard, getGovernanceGaps);
app.post('/api/v1/governance/risk/emergency-pause', authenticate, govGuard, triggerEmergencyPause);

// Forensic Analysis Engine
app.get('/api/v1/governance/forensic/summary', authenticate, govGuard, getForensicSummary);
app.get('/api/v1/governance/forensic/agents/:agentId', authenticate, govGuard, getAgentPerformance);

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
app.get('/api/v1/agents/workflows/stats', authenticate, getWorkflowStats);
app.get('/api/v1/agents/workflows/control-strip', authenticate, getControlStrip);
app.get('/api/v1/agents/workflows/analytics', authenticate, getWorkflowAnalytics);
app.get('/api/v1/agents/workflows/escalations', authenticate, getEscalationPaths);
app.get('/api/v1/agents/workflows/approvals', authenticate, getApprovals);
app.get('/api/v1/agents/workflows/approvals/stats', authenticate, getApprovalStats);
app.post('/api/v1/agents/workflows', authenticate, createWorkflow);
app.get('/api/v1/agents/workflows/active', authenticate, getActiveOrchestrations);
app.get('/api/v1/agents/workflows/graph', authenticate, getWorkflowGraphGeneral);
app.get('/api/v1/agents/workflows/versions/:versionId/submit', authenticate, submitForApproval);
app.post('/api/v1/agents/workflows/versions/:versionId/approve', authenticate, approveVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/reject', authenticate, rejectVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/activate', authenticate, activateVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/pause', authenticate, pauseWorkflow);
app.post('/api/v1/agents/workflows/versions/:versionId/retire', authenticate, retireWorkflow);
app.get('/api/v1/agents/workflows/versions/:versionId/graph', authenticate, getWorkflowGraph);
app.get('/api/v1/agents/workflows/versions/:versionId/validate', authenticate, validateReadiness);
app.post('/api/v1/agents/workflows/versions/:versionId/simulate', authenticate, runSimulation);
app.get('/api/v1/agents/workflows/versions/:versionId/simulations', authenticate, listSimulations);
app.post('/api/v1/agents/workflows/instances', authenticate, startWorkflowInstance);
app.get('/api/v1/agents/workflows/instances', authenticate, listInstances);
app.get('/api/v1/agents/workflows/instances/:instanceId', authenticate, getInstance);
app.patch('/api/v1/agents/workflows/instances/:instanceId/transition', authenticate, transitionInstance);
app.get('/api/v1/agents/workflows/instances/:instanceId/step-runs', authenticate, getInstanceStepRuns);
app.get('/api/v1/agents/workflows/instances/:instanceId/evidence', authenticate, getWorkflowEvidence);
app.post('/api/v1/agents/workflows/instances/:instanceId/evidence', authenticate, createEvidence);
app.post('/api/v1/agents/workflows/approvals/:approvalId/decide', authenticate, recordApproval);
app.get('/api/v1/agents/workflows/:id', authenticate, getWorkflow);
app.patch('/api/v1/agents/workflows/:id', authenticate, updateWorkflow);
app.delete('/api/v1/agents/workflows/:id', authenticate, deleteWorkflow);
app.post('/api/v1/agents/workflows/:id/duplicate', authenticate, duplicateWorkflow);
app.get('/api/v1/agents/workflows/:id/versions', authenticate, listVersions);
app.post('/api/v1/agents/workflows/:id/versions', authenticate, createDraftVersion);
app.post('/api/v1/agents/workflows/:id/rollback', authenticate, rollbackVersion);
app.get('/api/v1/agents/workflows/:id/dependencies', authenticate, getDependencies);
app.get('/api/v1/agents/:id', authenticate, getAgent);
app.post('/api/v1/agents', authenticate, registerAgent);
app.post('/api/v1/agents/:id/certify', authenticate, certifyAgent);
app.patch('/api/v1/agents/:id/autonomy', authenticate, updateAutonomy);
app.get('/api/v1/agents/:id/capabilities', authenticate, getAgentCapabilities);
app.get('/api/v1/agents/:id/versions', authenticate, getAgentVersions);
app.post('/api/v1/agents/:id/rollback', authenticate, rollbackAgent);
app.post('/api/v1/agents/:id/test', authenticate, runAgentSandbox);
app.get('/api/v1/agents/:id/tests', authenticate, getAgentTestHistory);
app.get('/api/v1/agents/:id/resources', authenticate, getAgentLinkedResources);
app.patch('/api/v1/agents/:id/resources', authenticate, updateLinkedResources);
app.get('/api/v1/agents/:id/checklist', authenticate, getChecklist);
app.get('/api/v1/agents/:id/evidence', authenticate, getAgentEvidence);
app.get('/api/v1/agents/evidence/:bundleId', authenticate, getEvidence);

// Agent Lifecycle — Deployment & Retirement
app.post('/api/v1/agents/:id/deploy', authenticate, deployAgent);
app.post('/api/v1/agents/:id/pause', authenticate, pauseAgent);
app.post('/api/v1/agents/:id/resume', authenticate, resumeAgent);
app.post('/api/v1/agents/:id/retire', authenticate, retireAgent);
app.post('/api/v1/agents/:id/clone', authenticate, cloneAgent);
app.post('/api/v1/agents/:id/approval/request', authenticate, requestApproval);
app.post('/api/v1/agents/:id/approval/approve', authenticate, approveAgent);
app.post('/api/v1/agents/:id/approval/reject', authenticate, rejectAgentApproval);
app.patch('/api/v1/agents/:id/runtime', authenticate, updateRuntimeControls);

// Agent Studio Extended Routes — Profile, Templates, Permission Sets, Safety, Platform, Incidents
app.patch('/api/v1/agents/:id/update', authenticate, updateAgent);
app.get('/api/v1/agents/templates', authenticate, listAgentTemplates);
app.get('/api/v1/agents/templates/:id', authenticate, getAgentTemplate);
app.post('/api/v1/agents/from-template', authenticate, createAgentFromTemplate);
app.get('/api/v1/agents/:id/profile', authenticate, getAgentProfile);
app.get('/api/v1/agents/:id/governance-gates', authenticate, getAgentGovernanceGates);
app.get('/api/v1/agents/:id/permissions', authenticate, getAgentPermissionSets);
app.patch('/api/v1/agents/:id/permissions', authenticate, updateAgentPermissionSets);
app.post('/api/v1/agents/:id/safety-checks/run', authenticate, runAgentSafetyChecks);
app.get('/api/v1/agents/:id/safety-checks', authenticate, getAgentSafetyResults);
app.post('/api/v1/agents/:id/platform-checks/run', authenticate, runAgentPlatformChecks);
app.get('/api/v1/agents/:id/platform-checks', authenticate, getAgentPlatformCheckHistory);
app.get('/api/v1/agents/:id/incidents', authenticate, getAgentIncidents);
app.post('/api/v1/agents/:id/incidents', authenticate, createAgentIncident);
app.patch('/api/v1/agents/:id/incidents/:incidentId/resolve', authenticate, resolveAgentIncident);

// Agent Operations Routes
app.get('/api/v1/operations/runs', authenticate, listAgentRuns);
app.get('/api/v1/operations/runs/:id', authenticate, getAgentRun);
app.get('/api/v1/operations/runs/:id/timeline', authenticate, getRunTimeline);
app.post('/api/v1/operations/runs/:id/pause', authenticate, pauseRun);
app.post('/api/v1/operations/runs/:id/resume', authenticate, resumeRun);
app.post('/api/v1/operations/runs/:id/stop', authenticate, stopRun);
app.post('/api/v1/operations/runs/:id/retry', authenticate, retryRun);
app.post('/api/v1/operations/runs/:id/quarantine', authenticate, quarantineRun);
app.get('/api/v1/operations/queues', authenticate, listQueues);
app.post('/api/v1/operations/queues/:id/assign', authenticate, assignQueueItem);
app.post('/api/v1/operations/incidents', authenticate, createIncident);
app.get('/api/v1/operations/incidents', authenticate, listIncidents);
app.patch('/api/v1/operations/incidents/:id/resolve', authenticate, resolveIncident);
app.get('/api/v1/operations/stats', authenticate, getOperationsStats);
app.get('/api/v1/operations/evidence/:bundleId', authenticate, getRunEvidence);
app.post('/api/v1/operations/evidence/:bundleId/export', authenticate, exportEvidence);
app.post('/api/v1/operations/runs/:id/emergency-pause', authenticate, emergencyPause);
app.post('/api/v1/operations/runs/:id/escalate', authenticate, escalateRun);
app.post('/api/v1/operations/runs/:id/restricted-mode', authenticate, restrictedMode);
app.post('/api/v1/operations/runs/:id/policy-check', authenticate, runPolicyCheck);
app.get('/api/v1/operations/runs/:id/policy-results', authenticate, getPolicyResults);
app.get('/api/v1/operations/runs/:id/control-log', authenticate, getRuntimeControlLog);
app.get('/api/v1/operations/analytics', authenticate, getAnalyticsMetrics);
app.post('/api/v1/operations/evidence', authenticate, createEvidenceBundle);
app.post('/api/v1/operations/evidence/:bundleId/lock', authenticate, lockEvidenceBundle);
app.get('/api/v1/operations/evidence', authenticate, listEvidenceBundles);

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

// Knowledge Base Routes — Governed Knowledge Layer
// Legacy endpoints (backward compat)
app.get('/api/v1/knowledge/bases', authenticate, KnowledgeController.listBases);
app.post('/api/v1/knowledge/bases', authenticate, KnowledgeController.createBase);
app.delete('/api/v1/knowledge/bases/:baseId', authenticate, KnowledgeController.deleteBase);
app.get('/api/v1/knowledge/bases/:baseId/entries', authenticate, KnowledgeController.listEntries);
app.post('/api/v1/knowledge/bases/:baseId/entries', authenticate, upload.single('file'), KnowledgeController.createEntry);
app.delete('/api/v1/knowledge/entries/:entryId', authenticate, KnowledgeController.deleteEntry);
app.get('/api/v1/knowledge/ai-context', authenticate, KnowledgeController.getAIContext);

// Collections API (governed)
app.get('/api/v1/knowledge/collections', authenticate, KnowledgeController.listCollections);
app.get('/api/v1/knowledge/collections/:id', authenticate, KnowledgeController.getCollection);
app.post('/api/v1/knowledge/collections', authenticate, KnowledgeController.createCollection);
app.patch('/api/v1/knowledge/collections/:id', authenticate, KnowledgeController.updateCollection);
app.delete('/api/v1/knowledge/collections/:id', authenticate, KnowledgeController.deleteCollection);

// Sources API (governed)
app.get('/api/v1/knowledge/sources', authenticate, KnowledgeController.listSources);
app.get('/api/v1/knowledge/sources/:id', authenticate, KnowledgeController.getSource);
app.post('/api/v1/knowledge/collections/:collectionId/sources', authenticate, upload.single('file'), KnowledgeController.createSource);
app.patch('/api/v1/knowledge/sources/:id', authenticate, KnowledgeController.updateSource);
app.delete('/api/v1/knowledge/sources/:id', authenticate, KnowledgeController.deleteSource);

// Source lifecycle management
app.post('/api/v1/knowledge/entries/:id/approve', authenticate, KnowledgeController.approveSource);
app.post('/api/v1/knowledge/entries/:id/reject', authenticate, KnowledgeController.rejectSource);
app.post('/api/v1/knowledge/entries/:id/retire', authenticate, KnowledgeController.retireSource);
app.post('/api/v1/knowledge/sources/:id/approve', authenticate, KnowledgeController.approveSource);
app.post('/api/v1/knowledge/sources/:id/reject', authenticate, KnowledgeController.rejectSource);
app.post('/api/v1/knowledge/sources/:id/retire', authenticate, KnowledgeController.retireSource);
app.post('/api/v1/knowledge/sources/:id/activate', authenticate, KnowledgeController.activateSource);
app.post('/api/v1/knowledge/sources/:id/publish', authenticate, KnowledgeController.publishSource);
app.post('/api/v1/knowledge/sources/:id/restrict', authenticate, KnowledgeController.restrictSource);
app.post('/api/v1/knowledge/sources/:id/quarantine', authenticate, KnowledgeController.quarantineSource);

// Stats
app.get('/api/v1/knowledge/stats', authenticate, KnowledgeController.getStats);

// Conflicts API
app.get('/api/v1/knowledge/conflicts', authenticate, KnowledgeController.listConflicts);
app.get('/api/v1/knowledge/conflicts/:id', authenticate, KnowledgeController.getConflict);
app.post('/api/v1/knowledge/conflicts', authenticate, KnowledgeController.createConflict);
app.post('/api/v1/knowledge/conflicts/:id/resolve', authenticate, KnowledgeController.resolveConflict);

// Retrieval Logs API
app.get('/api/v1/knowledge/retrieval-logs', authenticate, KnowledgeController.listRetrievalLogs);
app.post('/api/v1/knowledge/retrieval-logs', authenticate, KnowledgeController.logRetrievalEvent);

// Reviews API
app.get('/api/v1/knowledge/reviews', authenticate, KnowledgeController.listReviews);

// Chunks API
app.get('/api/v1/knowledge/sources/:sourceId/chunks', authenticate, KnowledgeController.listChunks);

// Search API
app.get('/api/v1/knowledge/search', authenticate, KnowledgeController.searchSources);

// Access Policy API
app.get('/api/v1/knowledge/access-policy', authenticate, KnowledgeController.getAccessPolicy);
app.post('/api/v1/knowledge/access-policy', authenticate, KnowledgeController.upsertAccessPolicy);

// ─── Prompt Governance Routes ────────────────────────────────────────────
// Static routes (must come before parameterized :id routes)
app.get('/api/v1/prompts/stats', authenticate, PromptController.getPromptStats);
app.get('/api/v1/prompts/approvals/stats', authenticate, PromptController.getApprovalStats);

// Versions sub-routes (no :id prefix)
app.post('/api/v1/prompts/versions/:versionId/approve', authenticate, PromptController.approveVersion);
app.post('/api/v1/prompts/versions/:versionId/reject', authenticate, PromptController.rejectVersion);
app.post('/api/v1/prompts/versions/:versionId/deploy', authenticate, PromptController.deployVersion);
app.get('/api/v1/prompts/versions/:versionId/tests/runs', authenticate, PromptController.listTestRuns);
app.post('/api/v1/prompts/versions/:versionId/tests/run', authenticate, PromptController.runTests);
app.get('/api/v1/prompts/versions/:versionId/approvals', authenticate, PromptController.listApprovals);
app.get('/api/v1/prompts/versions/:versionId/deployments', authenticate, PromptController.listDeployments);
app.get('/api/v1/prompts/versions/:versionId/bindings', authenticate, PromptController.listBindings);
app.post('/api/v1/prompts/versions/:versionId/bindings', authenticate, PromptController.createBinding);
app.get('/api/v1/prompts/versions/:versionId/knowledge', authenticate, PromptController.listKnowledgeBindings);
app.post('/api/v1/prompts/versions/:versionId/knowledge', authenticate, PromptController.createKnowledgeBinding);
app.get('/api/v1/prompts/versions/:versionId/tools', authenticate, PromptController.listToolPermissions);
app.post('/api/v1/prompts/versions/:versionId/tools', authenticate, PromptController.createToolPermission);

// Prompt CRUD (parameterized :id routes)
app.get('/api/v1/prompts', authenticate, PromptController.listPrompts);
app.post('/api/v1/prompts', authenticate, PromptController.createPrompt);
app.get('/api/v1/prompts/:id', authenticate, PromptController.getPrompt);
app.patch('/api/v1/prompts/:id', authenticate, PromptController.updatePrompt);
app.post('/api/v1/prompts/:id/clone', authenticate, PromptController.clonePrompt);

// Lifecycle actions
app.post('/api/v1/prompts/:id/pause', authenticate, PromptController.pausePrompt);
app.post('/api/v1/prompts/:id/resume', authenticate, PromptController.resumePrompt);
app.post('/api/v1/prompts/:id/archive', authenticate, PromptController.archivePrompt);
app.post('/api/v1/prompts/:id/retire', authenticate, PromptController.retirePrompt);
app.post('/api/v1/prompts/:id/submit-review', authenticate, PromptController.submitForReview);
app.post('/api/v1/prompts/:id/rollback', authenticate, PromptController.rollbackPrompt);

// Versions (under :id)
app.get('/api/v1/prompts/:id/versions', authenticate, PromptController.listVersions);
app.post('/api/v1/prompts/:id/versions', authenticate, PromptController.createVersion);
app.get('/api/v1/prompts/:id/versions/:versionId', authenticate, PromptController.getVersion);

// Tests (under :id)
app.get('/api/v1/prompts/:id/tests/suites', authenticate, PromptController.listTestSuites);
app.post('/api/v1/prompts/:id/tests/suites', authenticate, PromptController.createTestSuite);

app.get('/api/v1/integrations/health', authenticate, getIntegrationHealth);

// Approval Workflow Routes
app.post('/api/v1/approvals/submit', authenticate, submitForReview);
app.get('/api/v1/approvals/queue', authenticate, getApprovalQueue);
app.get('/api/v1/approvals/stats', authenticate, getApprovalStatsLegacy);
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
