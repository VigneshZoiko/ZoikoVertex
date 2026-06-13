import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import os from 'os';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';

// Controllers
import { provisionUser, resendVerificationEmail } from './domains/identity/identityController';
import { generateContent, analyzeImage } from './domains/intelligence/intelligenceController';
import { transitionStatus, submitIntent, deleteIntent, listIntents, getQueue, reviewActionIntent } from './domains/governance/governanceController';
import {
  getAuditTrail, getAuditStats, 
  getEvidenceArtifacts, getEvidenceArtifactDetail, getEvidenceStats,
  applyLegalHold, listLegalHolds, releaseLegalHold,
  buildEvidencePack, listEvidencePacks, downloadEvidencePack
} from './domains/governance/evidenceController';
import {
  getEvents as getAuditEvents,
  getEventsStats as getAuditEventsStats,
  getEventDetail,
  getEventRelated,
  verifyChain,
  createExport,
  listExports,
  preserve,
  sealExpired,
  createInvestigation,
  createEvent,
  getEventDiffHandler,
  getCorrelationTimelineHandler,
  getEventClustersHandler,
} from './domains/evidence/auditTrailController';
import {
  subscribeSSE,
  createWebhookSubscription,
  listSubscriptionsRoute,
  deleteSubscriptionRoute,
  testSubscription,
  getSubscriptionById,
  updateSubscriptionRoute,
} from './domains/evidence/auditTrailStreamingController';
import { getRiskPulse, getActiveRiskFeed, getGovernanceGaps, triggerEmergencyPause } from './domains/governance/riskController';
import { getSafetyOverview, getSafetyComponents, getSafetyQueueSummary, getSafetyRecentDecisions, reviewCriticalQueue, requestEmergencyPause, sendMfaChallengeHandler } from './domains/governance/safetyController';
import { getSafetySignals, getSafetySignalDetail, createManualSignal, classifySafetySignal, routeSafetySignal, mergeSafetySignals, splitSafetySignal, closeSafetySignal, getSafetyActionsHistory } from './domains/governance/signalsController';
import { getPolicySummary, getPolicies, createPolicy, simulatePolicy, getEnforcementEvents } from './domains/governance/policyController';
import { getReviewQueue, getReviewDetail, submitReviewDecision } from './domains/governance/reviewController';
import { getForensicSummary, getAgentPerformance } from './domains/governance/forensicController';
import {
  listCases as listForensicCases,
  createCase as createForensicCase,
  getStats as getForensicStats,
  getCase as getForensicCase,
  updateCase as updateForensicCase,
  assignCase,
  addEvidence,
  listEvidence,
  pinEvidence,
  addNote,
  listNotes,
  addTask,
  updateTask,
  listTasks,
  listActions,
  getTimeline,
  closeCase,
  reopenCase,
  preserveToVault,
  applyLegalHold as applyForensicLegalHold,
  releaseLegalHold as releaseForensicLegalHold,
  getSlaReport,
  getEntityGraph,
  createExport as createForensicExport,
  listExports as listForensicExports,
  approveExport,
  rejectExport,
  generateExport,
  markEvidencePrivileged,
  unpinEvidence,
} from './domains/evidence/forensicHubController';
import {
  generateAiSummary,
  approveAiSummary as approveSummary,
  rejectAiSummary as rejectSummary,
  listAiSummaries,
  generateTimelineExplanation,
  detectAnomalies,
  listAnomalies,
  generateRecommendations,
  routeToSiem,
  getSiemHistory,
  createAuditorSession,
  getExportNarrative,
} from './domains/evidence/forensicPhase4Controller';
import {
  listEvidenceItems as listVaultEvidenceItems,
  getEvidenceItem,
  preserveEvidence,
  verifyEvidenceItem as verifyVaultEvidenceItem,
  createCollection,
  listCollections,
  getCollection,
  addItemsToCollection,
  getCollectionItems as getVaultCollectionItems,
  getVaultHealth,
  // Phase 2
  createPackage,
  listPackages as listVaultPackages,
  getPackage as getVaultPackage,
  sealPackage as sealVaultPackage,
  getPackageManifest as getVaultPackageManifest,
  verifyPackage as verifyVaultPackage,
  createExport as createVaultExport,
  listExports as listVaultExports,
  getExportReceipt,
  applyHold,
  listHolds as listVaultHolds,
  releaseHold,
  createRedactionPolicy,
  listRedactionPolicies,
  // Phase 3
  createShare,
  listShares as listVaultShares,
  getShare as getVaultShare,
  revokeShare,
  getShareAccessLogs,
  runDlpScan,
  getDlpScan,
  listDlpScans,
  // Phase 4
  createAsyncJob,
  listAsyncJobs as listVaultAsyncJobs,
  getAsyncJob,
  createChainAnchor,
  listChainAnchors,
  verifyChainAnchor,
  createTemplateVersion,
  listTemplateVersions,
} from './domains/evidence/evidenceVaultController';
import {
  listActors as listIdentityActors,
  getActor as getIdentityActor,
  getActorTimeline as getIdentityActorTimeline,
  getAuthoritySnapshot as getIdentityAuthoritySnapshot,
  getAuthorityAtEvent as getIdentityAuthorityAtEvent,
  verifyLedgerChain as verifyIdentityLedgerChain,
  listDelegations,
  createDelegation,
  revokeDelegation,
  listBreakGlass,
  requestBreakGlass,
  activateBreakGlass,
  endBreakGlass,
  reviewBreakGlass,
  exportLedger,
  preserveToVault as identityLedgerPreserveToVault,
  registerServiceAccount,
  listServiceAccounts,
  revokeServiceAccount,
  getActorTimelineWithSessions,
  evaluateActorRiskFlags,
  setActorRiskFlags
} from './domains/evidence/identityLedgerController';
import {
  routeToModule,
  executeChain,
  listRoutingHistory,
  listWorkflowChains,
} from './domains/governance/routingController';
import { getCollusionMetrics } from './domains/governance/collusionController';
import { getBrandProfiles, getLinguisticProfile, getClaimsLedger, updateBrandRule } from './domains/governance/brandController';
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback, handleThreadsDeauthorize, handleThreadsDataDeletion, handleTwitterCallback, handleYoutubeCallback, handleGoogleAdsCallback, disconnectAccount, getLinkedInPagesSession, saveLinkedInPages } from './domains/channels/socialController';
import { getRecommendations, schedulePost, cancelScheduledPost, listScheduledPosts, updateScheduledPost, getScheduledPost } from './domains/campaigns/schedulerController';
import { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, getCampaignPosts } from './domains/campaigns/campaignsController';
import { getCampaignStats, submitCampaignForReview, approveCampaign, checkLaunchGate, launchCampaign, pauseCampaign, resumeCampaign, emergencyPauseCampaign, getCampaignEvents, updateSpend } from './domains/campaigns/campaignsV2Controller';
import { requestBudgetAuth, getBudgetAuthForCampaign, listBudgetAuths, approveBudgetAuth, rejectBudgetAuth } from './domains/campaigns/budgetAuthController';
import { getMetaAdAccounts, linkAdAccount, createBoost, listBoosts, syncBoostMetrics, pauseBoost, resumeBoost, cancelBoost, getCampaignInsights, pushCampaignToMetaHandler } from './domains/campaigns/adsController';
import { listLibrary, addToLibrary, deleteFromLibrary, bulkDeleteFromLibrary, listStorageItems } from './domains/content/libraryController';
import { readRecentScans } from './modules/safety/scanLogger';
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
import { changePlan } from './domains/identity/planController';
import { listAccounts } from './domains/channels/accountsController';
import { getPlatformReach } from './domains/channels/platformInsightsController';
import { listMembers, listRequests, createRequest, updateRequest, deleteMember, updateMemberRole } from './domains/identity/teamController';
import { listUnits, createUnit, deleteUnit } from './domains/identity/unitsController';
import { performQualityCheck, listAuditItems, getAuditItem, getQaAuditStats, getAuditEligibility, getQaAuditTrail, startAudit, passAudit, failAudit, needsCorrection, escalateAudit, closeAudit, assignAuditorToItem, saveScorecard, overrideScorecard, addDefect, resolveDefect, addCorrectiveAction, updateCorrectiveAction,   addQaNote, addQaEvidence, generateSample, retryQaCallback, retryQaCallbackByItem, exportQaFindings, exportQaEvidence, getAuditDefects, getAuditCorrectiveActions, getAuditNotes, getAuditEvidence } from './domains/governance/qaController';
import {
  createException, listExceptions, getException, updateException,
  getExceptionStats, assignOwner, updateSeverity, updateStatus,
  addBlocker, getBlockers, addRemediation, completeRemediation, getRemediations,
  escalateException, requestOverride, decideOverride,
  addEvidence as addExceptionEvidence, getEvidence as getExceptionEvidence,
  resolveException as resolveExceptionV2,
  sendToValidation, sendToApprovals as sendExceptionToApprovals, sendToQualityAudit,
  getAuditTrail as getExceptionAuditTrail,
  exportExceptionRecord, closeExceptionCase, archiveExceptionCase, bulkExceptionAction,
} from './domains/governance/exceptionV2Controller';
import { listItems as listReviewItems, getItem as getReviewItem, takeAction as takeReviewAction, getStats as getReviewStats, getEligibility as getReviewEligibility, getAuditLog as getReviewAuditLog, createItem as createReviewItem, getReviewValidation, getReviewPolicyFlags, getReviewNotesHandler, getReviewRevisionHistory, assignReviewItemHandler, addReviewNoteHandler, bulkReviewAction } from './domains/governance/reviewQueueController';
import {   createValidationItem, listValidationItems, getValidationItem, assignValidator, runValidation, revalidateItem, getValidationRunResults, requestRevision, sendToReviewQueue, sendToApprovals, escalateValidation, applyOverride, blockItem, completeManualCheck, addValidatorNote, getValidationAuditTrail, getValidationStats, getValidationEligibility, retryValidationCallback, exportValidationRecord, getValidationRuns, getValidationGrounding, getValidationNotesList, getValidationManualChecks, getValidationApprovalReadiness, getValidationRuleHistory, returnToCreator } from './domains/governance/validationController';
import {
  KnowledgeController,
} from './modules/knowledge/knowledgeController';
import { PromptController } from './modules/prompts/promptController';
import { getResourceUsage, getTokenQuota, getStorageQuota, purchaseStorageAddon, checkAiTokenQuota } from './domains/monitoring/usageController';
import {
  getWalletData, updateAutoTopup, calculateFees, createDepositSession, stripeWebhook, simulateDeposit, syncDepositSession,
  getSpendCap, updateSpendCap, getBillingSettings, updateBillingSettings, getOvercharge, updateOvercharge,
  createSetupIntent, createSetupCheckout, syncCardSession, listPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod,
  getWalletBalance, createSubscription, cancelSubscription, getSubscription, listInvoices,
} from './domains/billing/walletController';
import { getSystemTelemetry, getMissionLogs } from './domains/monitoring/telemetryController';
import { performGlobalSearch } from './domains/admin/globalSearchController';
import { getIntegrationHealth } from './domains/monitoring/integrationHealthController';
import { enterpriseSignup } from './domains/identity/enterpriseSignupController';
import { setupWorkspace } from './domains/identity/onboardingController';
import { getWorkspaceSettings, updateWorkspaceSettings, exportWorkspaceData } from './domains/admin/workspaceController';
// New features from Naresh
import { listNotifications, markAsRead, markAllRead, clearNotifications } from './domains/identity/notificationController';
import {
  exportWorkflow,
  exportApprovals,
  exportEvidenceByRef,
  exportPdfReady,
  exportRuntimeTimeline,
  triggerWorkflowNotification,
} from './domains/agents/workflowController';
import { listRules, createRule, getRule, deleteRule, updateRule, submitRuleForReview, publishRule, deactivateRule, reactivateRule, archiveRule, cloneRule, getRuleScope, upsertRuleScope, getRulePath, upsertRulePath, getRuleVersions, getRuleAuditLog, getRuleConflicts, detectRuleConflicts, resolveRuleConflict, runRuleSimulation, getRuleStats, getRuleDetails, getRuleStagesHandler, getRuleEscalationsHandler, markRuleReadyToPublish, markRuleInvalid, suggestKeywords } from './domains/governance/ruleController';
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
  getPublishedContent,
  getWorkflowStats,
  getWorkflowAnalytics,
  getControlStrip,
  getEscalationPaths,
  startWorkflowInstance,
  executeWorkflowInstance,
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
  createEvidence,
  getThreeKeyChain,
  recordThreeKeyDecision,
  listPendingThreeKeyChains,
  getThreeKeyQuorum,
  saveWorkflowGraph,
  saveWorkflowStepConfig
} from './domains/agents/workflowController';
import {
  getPerformanceSummary,
  getPerformanceTrends,
  getHallucinationFlags,
  getAgentLeaderboard
} from './domains/monitoring/modelPerformanceController';

import { submitForReview, getApprovalQueue, getApprovalStats as getApprovalStatsLegacy, takeApprovalAction } from './domains/decisions/approvalController';
import {
  createApprovalItem, listApprovalItems, getApprovalItem as getV2ApprovalItem,
  takeApprovalAction as takeV2ApprovalAction, assignApprover, reassignApprover,
  getApprovalStats as getV2ApprovalStats, getApprovalEligibility,
  getApprovalPath, createApprovalPathHandler, getApprovalDecisions, getApprovalComments, addApprovalComment,
  getApprovalEvidence, addApprovalEvidence, getApprovalAuditTrail,
  exportApprovalRecord, retryCallback, bulkApprovalAction,
} from './domains/decisions/approvalV2Controller';
import { authenticate, provisionGuard, scopeGuard } from './shared/authMiddleware';
import { integrationPlanGate, blockApiKeyUsers, planRateLimit } from './shared/planLimits';
import { requireRole } from './shared/permissionMiddleware';
import { registerExecutionListeners } from './domains/channels/executionService';
import { registerEventBridge } from './services/eventBridge';
import {
  listApiKeys, createApiKey, revokeApiKey, deleteApiKey,
  listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getDeliveryLogs,
} from './domains/integrations/apiWebhookController';
import {
  listConnectors, createConnector, deleteConnector, getSyncLogs, triggerSync
} from './domains/integrations/dataConnectorController';
import {
  listAgentRuns,
  getAgentRun,
  getRunTimeline,
  pauseRun,
  resumeRun,
  startRun,
  deleteRun,
  stopRun,
  retryRun,
  quarantineRun,
  listQueues,
  assignQueueItem,
  resolveQueueItem,
  createIncident,
  listIncidents,
  resolveIncident,
  generatePostmortem,
  getPostmortem,
  getOperationsStats,
  getRunEvidence,
  exportEvidence,
  emergencyPause,
  escalateRun,
  restrictedMode,
  holdRun,
  releaseHoldRun,
  runPolicyCheck,
  getPolicyResults,
  getRuntimeControlLog,
  getAnalyticsMetrics,
  exportAnalyticsCSV,
  exportOutputSnapshot,
  createEvidenceBundle,
  lockEvidenceBundle,
  listEvidenceBundles,
  subscribeOperationsEvents
} from './domains/agents/operationsController';
import { requireOperationsAccess } from './services/operationsAuthorization.service';

const upload = multer({ dest: os.tmpdir() });
const app = express();
const port = env.PORT;

// Guard: replace any undefined route handler with a 501 stub so the server
// starts even when some controller exports are not yet implemented.
(function patchUndefinedHandlers(a: express.Express) {
  const stub = (path: string) => (_req: express.Request, res: express.Response) =>
    res.status(501).json({ error: `Route ${path} not yet implemented` });
  for (const m of ['get','post','put','patch','delete'] as const) {
    const orig = (a as any)[m].bind(a);
    (a as any)[m] = (path: string, ...handlers: any[]) =>
      orig(path, ...handlers.map(h => (typeof h === 'function' ? h : stub(path))));
  }
})(app);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const ALLOWED_ORIGINS = [
  env.FRONTEND_URL,
  'https://getzoikovertex.com',
  'https://www.getzoikovertex.com',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  credentials: true,
  optionsSuccessStatus: 204,
}));
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
app.post('/api/v1/onboarding/setup', authenticate, setupWorkspace);
app.post('/api/v1/users/provision', provisionGuard, provisionUser);
app.post('/api/v1/users/resend-verification', resendVerificationEmail);

// Protected Intelligence/AI
const acctView = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'MANAGER', 'REVIEWER', 'SECURITY_ADMIN');
const acctWrite = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'MANAGER', 'SECURITY_ADMIN');

app.post('/api/v1/ai/generate',      authenticate, planRateLimit('ai'), checkAiTokenQuota, scopeGuard('write:content', '*'), generateContent);
app.post('/api/v1/ai/analyze-image', authenticate, planRateLimit('ai'), checkAiTokenQuota, scopeGuard('write:content', '*'), analyzeImage);
app.post('/api/v1/qa/check', authenticate, planRateLimit('ai'), scopeGuard('write:content', '*'), performQualityCheck);
// ─── Exception Routes (v2 — Full wireframe) ────────────────────────────
app.get('/api/v1/exceptions/cases', authenticate, acctView, scopeGuard('read:governance', '*'), listExceptions);
app.post('/api/v1/exceptions/cases', authenticate, acctWrite, scopeGuard('write:governance', '*'), createException);
app.get('/api/v1/exceptions/cases/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getException);
app.patch('/api/v1/exceptions/cases/:id', authenticate, acctWrite, scopeGuard('write:governance', '*'), updateException);
app.get('/api/v1/exceptions/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getExceptionStats);
app.patch('/api/v1/exceptions/cases/:id/assign', authenticate, acctWrite, scopeGuard('write:governance', '*'), assignOwner);
app.patch('/api/v1/exceptions/cases/:id/severity', authenticate, acctWrite, scopeGuard('write:governance', '*'), updateSeverity);
app.patch('/api/v1/exceptions/cases/:id/status', authenticate, acctWrite, scopeGuard('write:governance', '*'), updateStatus);
app.get('/api/v1/exceptions/cases/:id/blockers', authenticate, acctView, scopeGuard('read:governance', '*'), getBlockers);
app.post('/api/v1/exceptions/cases/:id/blockers', authenticate, acctWrite, scopeGuard('write:governance', '*'), addBlocker);
app.get('/api/v1/exceptions/cases/:id/remediations', authenticate, acctView, scopeGuard('read:governance', '*'), getRemediations);
app.post('/api/v1/exceptions/cases/:id/remediations', authenticate, acctWrite, scopeGuard('write:governance', '*'), addRemediation);
app.post('/api/v1/exceptions/remediations/:remediationId/complete', authenticate, acctWrite, scopeGuard('write:governance', '*'), completeRemediation);
app.post('/api/v1/exceptions/cases/:id/escalate', authenticate, acctWrite, scopeGuard('write:governance', '*'), escalateException);
app.post('/api/v1/exceptions/cases/:id/override-request', authenticate, acctWrite, scopeGuard('write:governance', '*'), requestOverride);
app.post('/api/v1/exceptions/overrides/:overrideId/decide', authenticate, acctWrite, scopeGuard('write:governance', '*'), decideOverride);
app.post('/api/v1/exceptions/cases/:id/evidence', authenticate, acctWrite, scopeGuard('write:governance', '*'), addExceptionEvidence);
app.get('/api/v1/exceptions/cases/:id/evidence', authenticate, acctView, scopeGuard('read:governance', '*'), getExceptionEvidence);
app.post('/api/v1/exceptions/cases/:id/resolve', authenticate, acctWrite, scopeGuard('write:governance', '*'), resolveExceptionV2);
app.post('/api/v1/exceptions/cases/:id/close', authenticate, acctWrite, scopeGuard('write:governance', '*'), closeExceptionCase);
app.post('/api/v1/exceptions/cases/:id/archive', authenticate, acctWrite, scopeGuard('write:governance', '*'), archiveExceptionCase);
app.post('/api/v1/exceptions/cases/:id/send-to-validation', authenticate, acctWrite, scopeGuard('write:governance', '*'), sendToValidation);
app.post('/api/v1/exceptions/cases/:id/send-to-approvals', authenticate, acctWrite, scopeGuard('write:governance', '*'), sendExceptionToApprovals);
app.post('/api/v1/exceptions/cases/:id/send-to-quality-audit', authenticate, acctWrite, scopeGuard('write:governance', '*'), sendToQualityAudit);
app.get('/api/v1/exceptions/cases/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getExceptionAuditTrail);
app.post('/api/v1/exceptions/cases/:id/export', authenticate, acctView, scopeGuard('read:governance', '*'), exportExceptionRecord);
app.post('/api/v1/exceptions/bulk', authenticate, acctWrite, scopeGuard('write:governance', '*'), bulkExceptionAction);

// ─── Cross-Module Automated Routing ──────────────────────────────────────────
app.get('/api/v1/routing/chains', authenticate, scopeGuard('read:governance', '*'), listWorkflowChains);
app.post('/api/v1/routing/route', authenticate, scopeGuard('write:governance', '*'), routeToModule);
app.post('/api/v1/routing/chain', authenticate, scopeGuard('write:governance', '*'), executeChain);
app.get('/api/v1/routing/history', authenticate, scopeGuard('read:governance', '*'), listRoutingHistory);

const govGuard = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER');
// Protected Governance
app.post('/api/v1/governance/transition', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), transitionStatus);
app.post('/api/v1/governance/submit', authenticate, planRateLimit('general'), scopeGuard('write:content', 'write:publish', '*'), submitIntent);
app.get('/api/v1/governance/intents', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listIntents);
app.get('/api/v1/governance/queue', authenticate, planRateLimit('general'), scopeGuard('read:content', 'read:governance', '*'), getQueue);
app.delete('/api/v1/governance/intents/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), deleteIntent);
app.post('/api/v1/governance/intents/:id/review-action', authenticate, planRateLimit('general'), scopeGuard('write:content', 'write:publish', '*'), reviewActionIntent);

// Protected Evidence Vault & Audit Trail
app.get('/api/v1/governance/audit/trail', authenticate, govGuard, scopeGuard('read:governance', '*'), getAuditTrail);
app.get('/api/v1/governance/audit/stats', authenticate, govGuard, scopeGuard('read:governance', '*'), getAuditStats);
app.get('/api/v1/governance/evidence/stats', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceStats);
app.get('/api/v1/governance/evidence/artifacts', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceArtifacts);
app.get('/api/v1/governance/evidence/artifacts/:id', authenticate, govGuard, scopeGuard('read:governance', '*'), getEvidenceArtifactDetail);
app.get('/api/v1/governance/evidence/holds', authenticate, govGuard, scopeGuard('read:governance', '*'), listLegalHolds);
app.post('/api/v1/governance/evidence/holds', authenticate, govGuard, scopeGuard('write:governance', '*'), applyLegalHold);
app.delete('/api/v1/governance/evidence/holds/:id', authenticate, govGuard, scopeGuard('write:governance', '*'), releaseLegalHold);
app.get('/api/v1/governance/evidence/packs', authenticate, govGuard, scopeGuard('read:governance', '*'), listEvidencePacks);
app.post('/api/v1/governance/evidence/packs', authenticate, govGuard, scopeGuard('write:governance', '*'), buildEvidencePack);
app.get('/api/v1/governance/evidence/packs/:id/download', authenticate, govGuard, scopeGuard('read:governance', '*'), downloadEvidencePack);

// ─── Audit Trail Routes (Evidence Layer Module 1) ───────────────────────────
// NOTE: Static routes MUST be defined BEFORE parameterized :id routes.
app.post('/api/audit-events', authenticate, govGuard, scopeGuard('write:governance', '*'), createEvent);
app.get('/api/audit-events', authenticate, scopeGuard('read:governance', '*'), getAuditEvents);
app.get('/api/audit-events/stats', authenticate, scopeGuard('read:governance', '*'), getAuditEventsStats);
app.get('/api/audit-events/chain/verify', authenticate, govGuard, scopeGuard('read:governance', '*'), verifyChain);
app.get('/api/audit-events/exports', authenticate, scopeGuard('read:governance', '*'), listExports);
app.post('/api/audit-events/export', authenticate, govGuard, scopeGuard('write:governance', '*'), createExport);
app.post('/api/audit-events/preserve', authenticate, govGuard, scopeGuard('write:governance', '*'), preserve);
app.post('/api/audit-events/create-investigation', authenticate, govGuard, scopeGuard('write:governance', '*'), createInvestigation);
app.post('/api/audit-events/seal-expired', authenticate, govGuard, scopeGuard('write:governance', '*'), sealExpired);
app.get('/api/audit-events/subscribe', authenticate, scopeGuard('read:governance', '*'), subscribeSSE);
app.post('/api/audit-events/subscriptions', authenticate, govGuard, scopeGuard('write:governance', '*'), createWebhookSubscription);
app.get('/api/audit-events/subscriptions', authenticate, scopeGuard('read:governance', '*'), listSubscriptionsRoute);
app.get('/api/audit-events/subscriptions/:id', authenticate, scopeGuard('read:governance', '*'), getSubscriptionById);
app.patch('/api/audit-events/subscriptions/:id', authenticate, govGuard, scopeGuard('write:governance', '*'), updateSubscriptionRoute);
app.delete('/api/audit-events/subscriptions/:id', authenticate, govGuard, scopeGuard('write:governance', '*'), deleteSubscriptionRoute);
app.post('/api/audit-events/subscriptions/:id/test', authenticate, govGuard, scopeGuard('write:governance', '*'), testSubscription);
app.get('/api/audit-events/correlations/:key/:value/timeline', authenticate, scopeGuard('read:governance', '*'), getCorrelationTimelineHandler);
app.get('/api/audit-events/:id', authenticate, scopeGuard('read:governance', '*'), getEventDetail);
app.get('/api/audit-events/:id/related', authenticate, scopeGuard('read:governance', '*'), getEventRelated);
app.get('/api/audit-events/:id/diff', authenticate, scopeGuard('read:governance', '*'), getEventDiffHandler);
app.get('/api/audit-events/:id/clusters', authenticate, scopeGuard('read:governance', '*'), getEventClustersHandler);

// ─── Audit Trail Routes (Spec-Aligned /api/v1/evidence/audit-trail) ─────────
app.post('/api/v1/evidence/audit-trail/events', authenticate, govGuard, scopeGuard('write:governance', '*'), createEvent);
app.get('/api/v1/evidence/audit-trail/events', authenticate, scopeGuard('read:governance', '*'), getAuditEvents);
app.get('/api/v1/evidence/audit-trail/events/stats', authenticate, scopeGuard('read:governance', '*'), getAuditEventsStats);
app.get('/api/v1/evidence/audit-trail/events/chain/verify', authenticate, govGuard, scopeGuard('read:governance', '*'), verifyChain);
app.get('/api/v1/evidence/audit-trail/events/exports', authenticate, scopeGuard('read:governance', '*'), listExports);
app.post('/api/v1/evidence/audit-trail/events/export', authenticate, govGuard, scopeGuard('write:governance', '*'), createExport);
app.post('/api/v1/evidence/audit-trail/events/preserve', authenticate, govGuard, scopeGuard('write:governance', '*'), preserve);
app.post('/api/v1/evidence/audit-trail/events/create-investigation', authenticate, govGuard, scopeGuard('write:governance', '*'), createInvestigation);
app.post('/api/v1/evidence/audit-trail/events/seal-expired', authenticate, govGuard, scopeGuard('write:governance', '*'), sealExpired);
app.get('/api/v1/evidence/audit-trail/events/subscribe', authenticate, scopeGuard('read:governance', '*'), subscribeSSE);
app.post('/api/v1/evidence/audit-trail/events/subscriptions', authenticate, govGuard, scopeGuard('write:governance', '*'), createWebhookSubscription);
app.get('/api/v1/evidence/audit-trail/events/subscriptions', authenticate, scopeGuard('read:governance', '*'), listSubscriptionsRoute);
app.get('/api/v1/evidence/audit-trail/events/subscriptions/:id', authenticate, scopeGuard('read:governance', '*'), getSubscriptionById);
app.patch('/api/v1/evidence/audit-trail/events/subscriptions/:id', authenticate, govGuard, scopeGuard('write:governance', '*'), updateSubscriptionRoute);
app.delete('/api/v1/evidence/audit-trail/events/subscriptions/:id', authenticate, govGuard, scopeGuard('write:governance', '*'), deleteSubscriptionRoute);
app.post('/api/v1/evidence/audit-trail/events/subscriptions/:id/test', authenticate, govGuard, scopeGuard('write:governance', '*'), testSubscription);
app.get('/api/v1/evidence/audit-trail/events/correlations/:key/:value/timeline', authenticate, scopeGuard('read:governance', '*'), getCorrelationTimelineHandler);
app.get('/api/v1/evidence/audit-trail/events/:id', authenticate, scopeGuard('read:governance', '*'), getEventDetail);
app.get('/api/v1/evidence/audit-trail/events/:id/related', authenticate, scopeGuard('read:governance', '*'), getEventRelated);
app.get('/api/v1/evidence/audit-trail/events/:id/diff', authenticate, scopeGuard('read:governance', '*'), getEventDiffHandler);
app.get('/api/v1/evidence/audit-trail/events/:id/clusters', authenticate, scopeGuard('read:governance', '*'), getEventClustersHandler);

// ─── Forensic Hub Routes ──────────────────────────────────────────────────────
app.get('/api/forensic/cases/stats', authenticate, scopeGuard('read:governance', '*'), getForensicStats);
app.get('/api/forensic/cases/sla-report', authenticate, scopeGuard('read:governance', '*'), getSlaReport);
app.get('/api/forensic/cases', authenticate, scopeGuard('read:governance', '*'), listForensicCases);
app.post('/api/forensic/cases', authenticate, scopeGuard('write:governance', '*'), createForensicCase);
app.get('/api/forensic/cases/:caseId', authenticate, scopeGuard('read:governance', '*'), getForensicCase);
app.patch('/api/forensic/cases/:caseId', authenticate, scopeGuard('write:governance', '*'), updateForensicCase);
app.post('/api/forensic/cases/:caseId/assign', authenticate, scopeGuard('write:governance', '*'), assignCase);
app.post('/api/forensic/cases/:caseId/evidence', authenticate, scopeGuard('write:governance', '*'), addEvidence);
app.get('/api/forensic/cases/:caseId/evidence', authenticate, scopeGuard('read:governance', '*'), listEvidence);
app.post('/api/forensic/cases/:caseId/evidence/:evidenceId/pin', authenticate, scopeGuard('write:governance', '*'), pinEvidence);
app.post('/api/forensic/cases/:caseId/notes', authenticate, scopeGuard('write:governance', '*'), addNote);
app.get('/api/forensic/cases/:caseId/notes', authenticate, scopeGuard('read:governance', '*'), listNotes);
app.post('/api/forensic/cases/:caseId/tasks', authenticate, scopeGuard('write:governance', '*'), addTask);
app.get('/api/forensic/cases/:caseId/tasks', authenticate, scopeGuard('read:governance', '*'), listTasks);
app.patch('/api/forensic/cases/:caseId/tasks/:taskId', authenticate, scopeGuard('write:governance', '*'), updateTask);
app.get('/api/forensic/cases/:caseId/actions', authenticate, scopeGuard('read:governance', '*'), listActions);
app.get('/api/forensic/cases/:caseId/timeline', authenticate, scopeGuard('read:governance', '*'), getTimeline);
app.post('/api/forensic/cases/:caseId/close', authenticate, scopeGuard('write:governance', '*'), closeCase);
app.post('/api/forensic/cases/:caseId/reopen', authenticate, scopeGuard('write:governance', '*'), reopenCase);
// Phase 2 extensions
app.post('/api/forensic/cases/:caseId/preserve', authenticate, scopeGuard('write:governance', '*'), preserveToVault);
app.post('/api/forensic/cases/:caseId/legal-hold', authenticate, scopeGuard('write:governance', '*'), applyForensicLegalHold);
app.post('/api/forensic/cases/:caseId/legal-hold/release', authenticate, scopeGuard('write:governance', '*'), releaseForensicLegalHold);
// Phase 3: Export builder
app.post('/api/forensic/cases/:caseId/exports', authenticate, scopeGuard('write:governance', '*'), createForensicExport);
app.get('/api/forensic/cases/:caseId/exports', authenticate, scopeGuard('read:governance', '*'), listForensicExports);
app.post('/api/forensic/cases/:caseId/exports/:exportId/approve', authenticate, scopeGuard('write:governance', '*'), approveExport);
app.post('/api/forensic/cases/:caseId/exports/:exportId/reject', authenticate, scopeGuard('write:governance', '*'), rejectExport);
app.post('/api/forensic/cases/:caseId/exports/:exportId/generate', authenticate, scopeGuard('write:governance', '*'), generateExport);
// Phase 3: Entity graph
app.get('/api/forensic/cases/:caseId/graph', authenticate, scopeGuard('read:governance', '*'), getEntityGraph);
// Phase 3: Evidence privilege/unpin
app.post('/api/forensic/cases/:caseId/evidence/:evidenceId/privilege', authenticate, scopeGuard('write:governance', '*'), markEvidencePrivileged);
app.post('/api/forensic/cases/:caseId/evidence/:evidenceId/unpin', authenticate, scopeGuard('write:governance', '*'), unpinEvidence);
// Phase 4: AI Assist
app.post('/api/forensic/cases/:caseId/ai/summary', authenticate, scopeGuard('write:governance', '*'), generateAiSummary);
app.get('/api/forensic/cases/:caseId/ai/summaries', authenticate, scopeGuard('read:governance', '*'), listAiSummaries);
app.post('/api/forensic/cases/:caseId/ai/summaries/:summaryId/approve', authenticate, scopeGuard('write:governance', '*'), approveSummary);
app.post('/api/forensic/cases/:caseId/ai/summaries/:summaryId/reject', authenticate, scopeGuard('write:governance', '*'), rejectSummary);
app.post('/api/forensic/cases/:caseId/ai/timeline-explanation', authenticate, scopeGuard('write:governance', '*'), generateTimelineExplanation);
app.post('/api/forensic/cases/:caseId/ai/anomalies', authenticate, scopeGuard('write:governance', '*'), detectAnomalies);
app.get('/api/forensic/cases/:caseId/ai/anomalies', authenticate, scopeGuard('read:governance', '*'), listAnomalies);
app.post('/api/forensic/cases/:caseId/ai/recommendations', authenticate, scopeGuard('write:governance', '*'), generateRecommendations);
// Phase 4: SIEM Routing
app.post('/api/forensic/cases/:caseId/siem/route', authenticate, scopeGuard('write:governance', '*'), routeToSiem);
app.get('/api/forensic/cases/:caseId/siem/history', authenticate, scopeGuard('read:governance', '*'), getSiemHistory);
// Phase 4: External Auditor
app.post('/api/forensic/auditor/session', authenticate, scopeGuard('write:governance', '*'), createAuditorSession);
// Phase 4: Export Narrative
app.get('/api/forensic/exports/:exportId/narrative', authenticate, scopeGuard('read:governance', '*'), getExportNarrative);

// ─── Evidence Vault Routes (Evidence Layer Module 3) ────────────────────────────
app.get('/api/evidence-vault/health', authenticate, scopeGuard('read:governance', '*'), getVaultHealth);
app.get('/api/evidence-vault/items', authenticate, scopeGuard('read:governance', '*'), listVaultEvidenceItems);
app.get('/api/evidence-vault/items/:id', authenticate, scopeGuard('read:governance', '*'), getEvidenceItem);
app.post('/api/evidence-vault/items/preserve', authenticate, scopeGuard('write:governance', '*'), preserveEvidence);
app.post('/api/evidence-vault/items/:id/verify', authenticate, scopeGuard('write:governance', '*'), verifyVaultEvidenceItem);
app.get('/api/evidence-vault/collections', authenticate, scopeGuard('read:governance', '*'), listCollections);
app.post('/api/evidence-vault/collections', authenticate, scopeGuard('write:governance', '*'), createCollection);
app.get('/api/evidence-vault/collections/:id', authenticate, scopeGuard('read:governance', '*'), getCollection);
app.post('/api/evidence-vault/collections/:id/items', authenticate, scopeGuard('write:governance', '*'), addItemsToCollection);
app.get('/api/evidence-vault/collections/:id/items', authenticate, scopeGuard('read:governance', '*'), getVaultCollectionItems);

// ─── Evidence Vault Phase 2 Routes ───────────────────────────────────────────────
app.post('/api/evidence-vault/packages', authenticate, scopeGuard('write:governance', '*'), createPackage);
app.get('/api/evidence-vault/packages', authenticate, scopeGuard('read:governance', '*'), listVaultPackages);
app.get('/api/evidence-vault/packages/:id', authenticate, scopeGuard('read:governance', '*'), getVaultPackage);
app.post('/api/evidence-vault/packages/:id/seal', authenticate, scopeGuard('write:governance', '*'), sealVaultPackage);
app.get('/api/evidence-vault/packages/:id/manifest', authenticate, scopeGuard('read:governance', '*'), getVaultPackageManifest);
app.post('/api/evidence-vault/packages/:id/verify', authenticate, scopeGuard('write:governance', '*'), verifyVaultPackage);
app.post('/api/evidence-vault/exports', authenticate, scopeGuard('write:governance', '*'), createVaultExport);
app.get('/api/evidence-vault/exports', authenticate, scopeGuard('read:governance', '*'), listVaultExports);
app.get('/api/evidence-vault/exports/:id/receipt', authenticate, scopeGuard('read:governance', '*'), getExportReceipt);
app.post('/api/evidence-vault/holds', authenticate, scopeGuard('write:governance', '*'), applyHold);
app.get('/api/evidence-vault/holds', authenticate, scopeGuard('read:governance', '*'), listVaultHolds);
app.post('/api/evidence-vault/holds/:id/release', authenticate, scopeGuard('write:governance', '*'), releaseHold);
app.post('/api/evidence-vault/redaction-policies', authenticate, scopeGuard('write:governance', '*'), createRedactionPolicy);
app.get('/api/evidence-vault/redaction-policies', authenticate, scopeGuard('read:governance', '*'), listRedactionPolicies);

// ─── Evidence Vault Phase 3 Routes ───────────────────────────────────────────────
app.post('/api/evidence-vault/shares', authenticate, scopeGuard('write:governance', '*'), createShare);
app.get('/api/evidence-vault/shares', authenticate, scopeGuard('read:governance', '*'), listVaultShares);
app.get('/api/evidence-vault/shares/:id', authenticate, scopeGuard('read:governance', '*'), getVaultShare);
app.post('/api/evidence-vault/shares/:id/revoke', authenticate, scopeGuard('write:governance', '*'), revokeShare);
app.get('/api/evidence-vault/shares/:id/access-logs', authenticate, scopeGuard('read:governance', '*'), getShareAccessLogs);
app.post('/api/evidence-vault/dlp-scans', authenticate, scopeGuard('write:governance', '*'), runDlpScan);
app.get('/api/evidence-vault/dlp-scans', authenticate, scopeGuard('read:governance', '*'), listDlpScans);
app.get('/api/evidence-vault/dlp-scans/:id', authenticate, scopeGuard('read:governance', '*'), getDlpScan);

// ─── Evidence Vault Phase 4 Routes ───────────────────────────────────────────────
app.post('/api/evidence-vault/jobs', authenticate, scopeGuard('write:governance', '*'), createAsyncJob);
app.get('/api/evidence-vault/jobs', authenticate, scopeGuard('read:governance', '*'), listVaultAsyncJobs);
app.get('/api/evidence-vault/jobs/:id', authenticate, scopeGuard('read:governance', '*'), getAsyncJob);
app.post('/api/evidence-vault/chain-anchors', authenticate, scopeGuard('write:governance', '*'), createChainAnchor);
app.get('/api/evidence-vault/chain-anchors', authenticate, scopeGuard('read:governance', '*'), listChainAnchors);
app.get('/api/evidence-vault/chain-anchors/:anchorId/verify', authenticate, scopeGuard('read:governance', '*'), verifyChainAnchor);
app.post('/api/evidence-vault/templates', authenticate, scopeGuard('write:governance', '*'), createTemplateVersion);
app.get('/api/evidence-vault/templates', authenticate, scopeGuard('read:governance', '*'), listTemplateVersions);

// Identity Ledger
app.get('/api/identity-ledger/actors', authenticate, scopeGuard('read:governance', '*'), listIdentityActors);
app.get('/api/identity-ledger/actors/:actorId', authenticate, scopeGuard('read:governance', '*'), getIdentityActor);
app.get('/api/identity-ledger/actors/:actorId/timeline', authenticate, scopeGuard('read:governance', '*'), getIdentityActorTimeline);
app.get('/api/identity-ledger/authority-snapshots/:snapshotId', authenticate, scopeGuard('read:governance', '*'), getIdentityAuthoritySnapshot);
app.get('/api/identity-ledger/authority-at-event/:auditEventId', authenticate, scopeGuard('read:governance', '*'), getIdentityAuthorityAtEvent);
app.get('/api/identity-ledger/chain/verify', authenticate, scopeGuard('read:governance', '*'), verifyIdentityLedgerChain);
app.get('/api/identity-ledger/delegations', authenticate, scopeGuard('read:governance', '*'), listDelegations);
app.post('/api/identity-ledger/delegations', authenticate, scopeGuard('write:governance', '*'), createDelegation);
app.post('/api/identity-ledger/delegations/:id/revoke', authenticate, scopeGuard('write:governance', '*'), revokeDelegation);
app.get('/api/identity-ledger/break-glass', authenticate, scopeGuard('read:governance', '*'), listBreakGlass);
app.post('/api/identity-ledger/break-glass/request', authenticate, scopeGuard('write:governance', '*'), requestBreakGlass);
app.post('/api/identity-ledger/break-glass/:id/activate', authenticate, scopeGuard('write:governance', '*'), activateBreakGlass);
app.post('/api/identity-ledger/break-glass/:id/end', authenticate, scopeGuard('write:governance', '*'), endBreakGlass);
app.post('/api/identity-ledger/break-glass/:id/review', authenticate, scopeGuard('write:governance', '*'), reviewBreakGlass);
app.post('/api/identity-ledger/export', authenticate, scopeGuard('write:governance', '*'), exportLedger);
app.post('/api/identity-ledger/preserve', authenticate, scopeGuard('write:governance', '*'), identityLedgerPreserveToVault);

// Identity Ledger — Phase 2 Governance Depth
app.get('/api/identity-ledger/service-accounts', authenticate, scopeGuard('read:governance', '*'), listServiceAccounts);
app.post('/api/identity-ledger/service-accounts', authenticate, scopeGuard('write:governance', '*'), registerServiceAccount);
app.post('/api/identity-ledger/service-accounts/:actorId/revoke', authenticate, scopeGuard('write:governance', '*'), revokeServiceAccount);
app.get('/api/identity-ledger/actors/:actorId/timeline/sessions', authenticate, scopeGuard('read:governance', '*'), getActorTimelineWithSessions);
app.post('/api/identity-ledger/actors/:actorId/risk/evaluate', authenticate, scopeGuard('write:governance', '*'), evaluateActorRiskFlags);
app.put('/api/identity-ledger/actors/:actorId/risk/flags', authenticate, scopeGuard('write:governance', '*'), setActorRiskFlags);

// Protected Risk & Compliance Command Center
app.get('/api/v1/governance/risk/pulse', authenticate, govGuard, scopeGuard('read:governance', '*'), getRiskPulse);
app.get('/api/v1/governance/risk/feed', authenticate, govGuard, scopeGuard('read:governance', '*'), getActiveRiskFeed);
app.get('/api/v1/governance/risk/gaps', authenticate, govGuard, scopeGuard('read:governance', '*'), getGovernanceGaps);
app.post('/api/v1/governance/risk/emergency-pause', authenticate, govGuard, scopeGuard('read:governance', '*'), triggerEmergencyPause);

// Safety Layer Overview (Document 01) endpoints
app.get('/api/safety/overview', authenticate, getSafetyOverview);
app.get('/api/safety/components', authenticate, getSafetyComponents);
app.get('/api/safety/queue/summary', authenticate, getSafetyQueueSummary);
app.get('/api/safety/recent-decisions', authenticate, getSafetyRecentDecisions);
app.post('/api/safety/actions/review-critical-queue', authenticate, reviewCriticalQueue);
app.post('/api/safety/actions/request-emergency-pause', authenticate, requestEmergencyPause);
app.post('/api/safety/actions/send-mfa-challenge', authenticate, sendMfaChallengeHandler);
// Safety Layer Risk Intake & Triage (Document 02) endpoints
app.get('/api/safety/signals', authenticate, getSafetySignals);
app.get('/api/safety/signals/:id', authenticate, getSafetySignalDetail);
app.post('/api/safety/signals', authenticate, createManualSignal);
app.post('/api/safety/signals/:id/classify', authenticate, classifySafetySignal);
app.post('/api/safety/signals/:id/route', authenticate, routeSafetySignal);
app.post('/api/safety/signals/:id/merge', authenticate, mergeSafetySignals);
app.post('/api/safety/signals/:id/split', authenticate, splitSafetySignal);
app.post('/api/safety/signals/:id/close', authenticate, closeSafetySignal);
app.get('/api/safety/actions/history', authenticate, getSafetyActionsHistory);

// Safety Layer Policy Control Matrix & Guardrail Enforcement endpoints
app.get('/api/safety/policies/summary', authenticate, getPolicySummary);
app.get('/api/safety/policies', authenticate, getPolicies);
app.post('/api/safety/policies', authenticate, createPolicy);
app.post('/api/safety/policies/simulate', authenticate, simulatePolicy);
app.get('/api/safety/enforcement/events', authenticate, getEnforcementEvents);

// Safety Layer Human Review, Escalation & Approval Console endpoints
app.get('/api/safety/reviews', authenticate, getReviewQueue);
app.get('/api/safety/reviews/:id', authenticate, getReviewDetail);
app.post('/api/safety/reviews/:id/decision', authenticate, submitReviewDecision);

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
app.get('/api/auth/googleads/callback', handleGoogleAdsCallback);
// Protected Social/Account Routes
app.delete('/api/v1/accounts/:id', authenticate, disconnectAccount);
app.get('/api/v1/accounts/linkedin/pages', authenticate, getLinkedInPagesSession);
app.post('/api/v1/accounts/linkedin/pages', authenticate, saveLinkedInPages);

// Campaigns & Projects Routes
const campaignGuard = requireRole('ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'CREATOR', 'ANALYST', 'VIEWER', 'PUBLISHER', 'SUPERADMIN');
const campaignWriteGuard = requireRole('ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'SUPERADMIN');
// Launch guard relaxed to campaignWriteGuard while the campaign flow is being validated.
// Restore the original APPROVER/FINAL_APPROVER restriction once governance is re-enabled.
const campaignLaunchGuard = requireRole('ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'SUPERADMIN');
const campaignEmergencyGuard = requireRole('CRISIS_COMMANDER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN');

// Phase 1 — existing CRUD
app.get('/api/v1/campaigns',           authenticate, campaignGuard,       listCampaigns);
app.get('/api/v1/campaigns/stats',     authenticate, campaignGuard,       getCampaignStats);
app.get('/api/v1/campaigns/:id',       authenticate, campaignGuard,       getCampaign);
app.get('/api/v1/campaigns/:id/posts', authenticate, campaignGuard,       getCampaignPosts);
app.post('/api/v1/campaigns',          authenticate, campaignWriteGuard,  createCampaign);
app.patch('/api/v1/campaigns/:id',     authenticate, campaignWriteGuard,  updateCampaign);
app.delete('/api/v1/campaigns/:id',    authenticate, campaignWriteGuard,  deleteCampaign);

// Campaign lifecycle
app.post('/api/v1/campaigns/:id/submit-review',   authenticate, campaignWriteGuard,    submitCampaignForReview);
app.post('/api/v1/campaigns/:id/approve',         authenticate, campaignLaunchGuard,   approveCampaign);
app.get('/api/v1/campaigns/:id/launch-gate',      authenticate, campaignGuard,         checkLaunchGate);
app.post('/api/v1/campaigns/:id/launch',          authenticate, campaignLaunchGuard,   launchCampaign);
app.post('/api/v1/campaigns/:id/pause',           authenticate, campaignWriteGuard,    pauseCampaign);
app.post('/api/v1/campaigns/:id/resume',          authenticate, campaignWriteGuard,    resumeCampaign);
app.post('/api/v1/campaigns/:id/emergency-pause', authenticate, campaignEmergencyGuard, emergencyPauseCampaign);
app.get('/api/v1/campaigns/:id/events',           authenticate, campaignGuard,        getCampaignEvents);
app.patch('/api/v1/campaigns/:id/spend',          authenticate, campaignWriteGuard,   updateSpend);
app.post('/api/v1/campaigns/:id/push-to-meta',   authenticate, campaignLaunchGuard,  pushCampaignToMetaHandler);

// Client Meta Account routes (bring-your-own-account model)
import { listClientCampaignAccounts, fetchMetaAdAccounts, setAdAccount, fetchMetaPages, fetchMetaPixels, getPixelStats, createPixel, updatePixelName, deleteMetaPixel } from './domains/campaigns/metaAccountController';
import { publishToMeta, toggleMetaStatus, deleteFromMeta, syncFromMeta, getAdAccountDetails, verifyMetaCampaign } from './domains/campaigns/metaPublishController';
import { searchLocations, searchInterests, getReachEstimate } from './domains/campaigns/metaTargetingSearch';

// Client Meta account management
app.get('/api/v1/campaigns/meta/accounts',                        authenticate, campaignGuard, listClientCampaignAccounts);
app.post('/api/v1/campaigns/meta/accounts/:id/fetch-ad-accounts', authenticate, campaignGuard, fetchMetaAdAccounts);
app.post('/api/v1/campaigns/meta/accounts/:id/set-ad-account',    authenticate, campaignWriteGuard, setAdAccount);
app.get('/api/v1/campaigns/meta/pages',                           authenticate, campaignGuard, fetchMetaPages);
app.get('/api/v1/campaigns/meta/pixels',                          authenticate, campaignGuard,      fetchMetaPixels);
app.post('/api/v1/campaigns/meta/pixels',                         authenticate, campaignWriteGuard, createPixel);
app.get('/api/v1/campaigns/meta/pixels/:pixelId/stats',           authenticate, campaignGuard,      getPixelStats);
app.patch('/api/v1/campaigns/meta/pixels/:pixelId',               authenticate, campaignWriteGuard, updatePixelName);
app.delete('/api/v1/campaigns/meta/pixels/:pixelId',              authenticate, campaignWriteGuard, deleteMetaPixel);

// Meta campaign publish / sync
app.post('/api/v1/campaigns/:id/publish-to-meta',    authenticate, campaignWriteGuard,  publishToMeta);
app.get('/api/v1/campaigns/:id/meta-verify',         authenticate, campaignGuard,       verifyMetaCampaign);
app.post('/api/v1/campaigns/:id/toggle-meta-status', authenticate, campaignWriteGuard, toggleMetaStatus);
app.delete('/api/v1/campaigns/:id/meta',             authenticate, campaignWriteGuard, deleteFromMeta);
app.post('/api/v1/campaigns/meta/sync',              authenticate, campaignGuard,        syncFromMeta);
app.get('/api/v1/campaigns/meta/ad-account-details', authenticate, campaignGuard,        getAdAccountDetails);

// Meta targeting search (locations + interests from Meta API)
app.get('/api/v1/campaigns/meta/search/locations',    authenticate, campaignGuard, searchLocations);
app.get('/api/v1/campaigns/meta/search/interests',    authenticate, campaignGuard, searchInterests);
app.post('/api/v1/campaigns/meta/reach-estimate',     authenticate, campaignGuard, getReachEstimate);

// Budget Authorization routes (Phase 4)
app.post('/api/v1/campaigns/:id/budget-auth/request', authenticate, campaignWriteGuard,    requestBudgetAuth);
app.get('/api/v1/campaigns/:id/budget-auth',          authenticate, campaignGuard,         getBudgetAuthForCampaign);
app.get('/api/v1/budget-authorizations',              authenticate, campaignGuard,         listBudgetAuths);
app.post('/api/v1/budget-authorizations/:id/approve', authenticate, campaignLaunchGuard,   approveBudgetAuth);
app.post('/api/v1/budget-authorizations/:id/reject',  authenticate, campaignLaunchGuard,   rejectBudgetAuth);

// Ads / Boost routes (Meta Ads — Phase 2)
const adsGuard = requireRole('ADMIN', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'SUPERADMIN');
app.get('/api/v1/ads/accounts/:connectedAccountId/ad-accounts',  authenticate, adsGuard, getMetaAdAccounts);
app.post('/api/v1/ads/accounts/:connectedAccountId/link-ad-account', authenticate, adsGuard, linkAdAccount);
app.post('/api/v1/ads/boosts',          authenticate, adsGuard, createBoost);
app.get('/api/v1/ads/boosts',           authenticate, adsGuard, listBoosts);
app.post('/api/v1/ads/boosts/:id/sync', authenticate, adsGuard, syncBoostMetrics);
app.post('/api/v1/ads/boosts/:id/pause',   authenticate, adsGuard, pauseBoost);
app.post('/api/v1/ads/boosts/:id/resume',  authenticate, adsGuard, resumeBoost);
app.delete('/api/v1/ads/boosts/:id',       authenticate, adsGuard, cancelBoost);
app.get('/api/v1/campaigns/:id/insights',  authenticate, adsGuard, getCampaignInsights);


// Protected Scheduler Routes
app.post('/api/v1/scheduler/recommend', authenticate, planRateLimit('general'), checkAiTokenQuota, scopeGuard('read:content', '*'), getRecommendations);
app.get('/api/v1/scheduler/posts', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listScheduledPosts);
app.get('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), getScheduledPost);
app.post('/api/v1/scheduler/posts', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), schedulePost);
app.put('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), updateScheduledPost);
app.delete('/api/v1/scheduler/posts/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), cancelScheduledPost);

// Protected Library Routes
app.get('/api/v1/library', authenticate, planRateLimit('general'), scopeGuard('read:content', '*'), listLibrary);
app.post('/api/v1/library/upload', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), addToLibrary);
app.post('/api/v1/library/bulk-delete', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), bulkDeleteFromLibrary);
app.delete('/api/v1/library/bulk', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), bulkDeleteFromLibrary);
app.delete('/api/v1/library/:id', authenticate, planRateLimit('general'), scopeGuard('write:content', '*'), deleteFromLibrary);
app.get('/api/v1/library/scan-logs', authenticate, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ success: true, data: readRecentScans(limit) });
});

// Protected User Routes
app.get('/api/v1/user/context', authenticate, getUserContext);
app.patch('/api/v1/admin/plan', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'), changePlan);
app.post('/api/v1/user/downgrade-to-free', authenticate, SuperAdminController.downgradeToFreePlan);

// Workspace Settings Routes
const workspaceGuard = requireRole('ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN', 'PRIVACY_ADMIN', 'SUPERADMIN');
app.get('/api/v1/workspace/settings', authenticate, workspaceGuard, getWorkspaceSettings);
app.patch('/api/v1/workspace/settings', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), updateWorkspaceSettings);
app.get('/api/v1/workspace/data-export', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), exportWorkspaceData);

// Workflow RBAC guards
const workflowView = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'SUPERADMIN');
const workflowWrite = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'SUPERADMIN');
const workflowApprove = requireRole('ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'SUPERADMIN');
const workflowAdmin = requireRole('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN');

// Workspace Settings Routes
// Protected Account Routes
app.get('/api/v1/accounts', authenticate, listAccounts);
app.get('/api/v1/analytics/platform-reach', authenticate, getPlatformReach);

// Protected Team Routes
app.get('/api/v1/team/members', authenticate, listMembers);
app.patch('/api/v1/team/members/:id/role', authenticate, requireRole('ADMIN', 'WORKSPACE_OWNER'), updateMemberRole);
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
// ─── Workflow Routes ──────────────────────────────────────────────────────────
// All endpoints under /api/v1/agents/workflows manage workflow templates,
// versions, instances, approvals, simulations, evidence, exports, and Three-Key
// approval chains. Middleware: authenticate → workflowView/Write/Approve/Admin
// → scopeGuard. See workflowController.ts for each handler's JSDoc.

app.get('/api/v1/agents/workflows', authenticate, workflowView, scopeGuard('read:agents', '*'), listWorkflows);
app.get('/api/v1/agents/workflows/stats', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflowStats);
app.get('/api/v1/agents/workflows/control-strip', authenticate, workflowView, scopeGuard('read:agents', '*'), getControlStrip);
app.get('/api/v1/agents/workflows/analytics', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflowAnalytics);
app.get('/api/v1/agents/workflows/active', authenticate, workflowView, scopeGuard('read:agents', '*'), getActiveOrchestrations);
app.get('/api/v1/agents/workflows/published-content', authenticate, workflowView, scopeGuard('read:agents', '*'), getPublishedContent);
app.get('/api/v1/agents/workflows/graph', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflowGraphGeneral);
app.get('/api/v1/agents/workflows/escalations', authenticate, workflowView, scopeGuard('read:agents', '*'), getEscalationPaths);
app.get('/api/v1/agents/workflows/approvals', authenticate, workflowView, scopeGuard('read:agents', '*'), getApprovals);
app.get('/api/v1/agents/workflows/approvals/stats', authenticate, workflowView, scopeGuard('read:agents', '*'), getApprovalStats);
app.post('/api/v1/agents/workflows', authenticate, workflowWrite, scopeGuard('write:agents', '*'), createWorkflow);
app.post('/api/v1/agents/workflows/versions/:versionId/submit', authenticate, workflowWrite, scopeGuard('write:agents', '*'), submitForApproval);
app.post('/api/v1/agents/workflows/versions/:versionId/approve', authenticate, workflowApprove, scopeGuard('write:agents', '*'), approveVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/reject', authenticate, workflowApprove, scopeGuard('write:agents', '*'), rejectVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/activate', authenticate, workflowApprove, scopeGuard('write:agents', '*'), activateVersion);
app.post('/api/v1/agents/workflows/versions/:versionId/pause', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), pauseWorkflow);
app.post('/api/v1/agents/workflows/versions/:versionId/retire', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), retireWorkflow);
app.get('/api/v1/agents/workflows/versions/:versionId/graph', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflowGraph);
app.post('/api/v1/agents/workflows/versions/:versionId/graph', authenticate, workflowWrite, scopeGuard('write:agents', '*'), saveWorkflowGraph);
app.patch('/api/v1/agents/workflows/steps/:stepId', authenticate, workflowWrite, scopeGuard('write:agents', '*'), saveWorkflowStepConfig);
app.get('/api/v1/agents/workflows/versions/:versionId/validate', authenticate, workflowView, scopeGuard('read:agents', '*'), validateReadiness);
app.post('/api/v1/agents/workflows/versions/:versionId/simulate', authenticate, workflowWrite, scopeGuard('write:agents', '*'), runSimulation);
app.get('/api/v1/agents/workflows/versions/:versionId/simulations', authenticate, workflowView, scopeGuard('read:agents', '*'), listSimulations);
app.post('/api/v1/agents/workflows/instances', authenticate, workflowWrite, scopeGuard('write:agents', '*'), startWorkflowInstance);
app.get('/api/v1/agents/workflows/instances', authenticate, workflowView, scopeGuard('read:agents', '*'), listInstances);
app.get('/api/v1/agents/workflows/instances/:instanceId', authenticate, workflowView, scopeGuard('read:agents', '*'), getInstance);
app.patch('/api/v1/agents/workflows/instances/:instanceId/transition', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), transitionInstance);
app.post('/api/v1/agents/workflows/instances/:instanceId/execute', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), executeWorkflowInstance);
app.get('/api/v1/agents/workflows/instances/:instanceId/step-runs', authenticate, workflowView, scopeGuard('read:agents', '*'), getInstanceStepRuns);
app.get('/api/v1/agents/workflows/instances/:instanceId/evidence', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflowEvidence);
app.post('/api/v1/agents/workflows/instances/:instanceId/evidence', authenticate, workflowWrite, scopeGuard('write:agents', '*'), createEvidence);
app.post('/api/v1/agents/workflows/approvals/:approvalId/decide', authenticate, workflowApprove, scopeGuard('write:agents', '*'), recordApproval);
app.get('/api/v1/agents/workflows/:id', authenticate, workflowView, scopeGuard('read:agents', '*'), getWorkflow);
app.patch('/api/v1/agents/workflows/:id', authenticate, workflowWrite, scopeGuard('write:agents', '*'), updateWorkflow);
app.delete('/api/v1/agents/workflows/:id', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), deleteWorkflow);
app.post('/api/v1/agents/workflows/:id/duplicate', authenticate, workflowWrite, scopeGuard('write:agents', '*'), duplicateWorkflow);
app.get('/api/v1/agents/workflows/:id/versions', authenticate, workflowView, scopeGuard('read:agents', '*'), listVersions);
app.post('/api/v1/agents/workflows/:id/versions', authenticate, workflowWrite, scopeGuard('write:agents', '*'), createDraftVersion);
app.post('/api/v1/agents/workflows/:id/rollback', authenticate, workflowAdmin, scopeGuard('write:agents', '*'), rollbackVersion);
app.get('/api/v1/agents/workflows/:id/dependencies', authenticate, workflowView, scopeGuard('read:agents', '*'), getDependencies);

// ─── Export Routes ────────────────────────────────────────────────────────────
app.get('/api/v1/agents/workflows/:id/export', authenticate, workflowView, scopeGuard('read:agents', '*'), exportWorkflow);
app.get('/api/v1/agents/workflows/:id/export/approvals', authenticate, workflowView, scopeGuard('read:agents', '*'), exportApprovals);
app.get('/api/v1/agents/workflows/:id/export/pdf-ready', authenticate, workflowView, scopeGuard('read:agents', '*'), exportPdfReady);
app.get('/api/v1/agents/workflows/:id/export/timeline', authenticate, workflowView, scopeGuard('read:agents', '*'), exportRuntimeTimeline);
app.get('/api/v1/agents/workflows/export/evidence/:evidenceRef', authenticate, workflowView, scopeGuard('read:agents', '*'), exportEvidenceByRef);

// ─── Notification Route ───────────────────────────────────────────────────────
app.post('/api/v1/agents/workflows/:id/notify', authenticate, workflowWrite, scopeGuard('write:agents', '*'), triggerWorkflowNotification);

// ─── Three-Key Approval Routes ────────────────────────────────────────────────
app.get('/api/v1/agents/workflows/three-key/pending/list', authenticate, workflowView, scopeGuard('read:agents', '*'), listPendingThreeKeyChains);
app.get('/api/v1/agents/workflows/three-key/:versionId', authenticate, workflowApprove, scopeGuard('read:agents', '*'), getThreeKeyChain);
app.get('/api/v1/agents/workflows/three-key/:versionId/quorum', authenticate, workflowView, scopeGuard('read:agents', '*'), getThreeKeyQuorum);
app.post('/api/v1/agents/workflows/three-key/:chainId/decide', authenticate, workflowApprove, scopeGuard('write:agents', '*'), recordThreeKeyDecision);

app.get('/api/v1/agents/:id', authenticate, scopeGuard('read:agents', '*'), getAgent);
app.post('/api/v1/agents', authenticate, scopeGuard('write:agents', '*'), registerAgent);
app.post('/api/v1/agents/:id/certify', authenticate, scopeGuard('write:agents', '*'), certifyAgent);
app.post('/api/v1/agents/:id/sandbox', authenticate, scopeGuard('write:agents', '*'), runAgentSandbox);
app.get('/api/v1/agents/:id/sandbox/history', authenticate, scopeGuard('read:agents', '*'), getAgentTestHistory);
app.patch('/api/v1/agents/:id/autonomy', authenticate, scopeGuard('write:agents', '*'), updateAutonomy);
app.get('/api/v1/agents/:id/capabilities', authenticate, scopeGuard('read:agents', '*'), getAgentCapabilities);
app.get('/api/v1/agents/:id/versions', authenticate, scopeGuard('read:agents', '*'), getAgentVersions);
app.post('/api/v1/agents/:id/rollback', authenticate, scopeGuard('write:agents', '*'), rollbackAgent);
app.post('/api/v1/agents/:id/test', authenticate, scopeGuard('write:agents', '*'), runAgentSandbox);
app.get('/api/v1/agents/:id/tests', authenticate, scopeGuard('read:agents', '*'), getAgentTestHistory);
app.get('/api/v1/agents/:id/resources', authenticate, scopeGuard('read:agents', '*'), getAgentLinkedResources);
app.patch('/api/v1/agents/:id/resources', authenticate, scopeGuard('write:agents', '*'), updateLinkedResources);
app.get('/api/v1/agents/:id/checklist', authenticate, scopeGuard('read:agents', '*'), getChecklist);
app.get('/api/v1/agents/:id/evidence', authenticate, scopeGuard('read:agents', '*'), getAgentEvidence);
app.get('/api/v1/agents/evidence/:bundleId', authenticate, scopeGuard('read:agents', '*'), getEvidence);

// Agent Lifecycle — Deployment & Retirement
app.post('/api/v1/agents/:id/deploy', authenticate, scopeGuard('write:agents', '*'), deployAgent);
app.post('/api/v1/agents/:id/pause', authenticate, scopeGuard('write:agents', '*'), pauseAgent);
app.post('/api/v1/agents/:id/resume', authenticate, scopeGuard('write:agents', '*'), resumeAgent);
app.post('/api/v1/agents/:id/retire', authenticate, scopeGuard('write:agents', '*'), retireAgent);
app.post('/api/v1/agents/:id/clone', authenticate, scopeGuard('write:agents', '*'), cloneAgent);
app.post('/api/v1/agents/:id/approval/request', authenticate, scopeGuard('write:agents', '*'), requestApproval);
app.post('/api/v1/agents/:id/approval/approve', authenticate, scopeGuard('write:agents', '*'), approveAgent);
app.post('/api/v1/agents/:id/approval/reject', authenticate, scopeGuard('write:agents', '*'), rejectAgentApproval);
app.patch('/api/v1/agents/:id/runtime', authenticate, scopeGuard('write:agents', '*'), updateRuntimeControls);

// Agent Studio Extended Routes — Profile, Templates, Permission Sets, Safety, Platform, Incidents
app.patch('/api/v1/agents/:id/update', authenticate, scopeGuard('write:agents', '*'), updateAgent);
app.get('/api/v1/agents/templates', authenticate, scopeGuard('read:agents', '*'), listAgentTemplates);
app.get('/api/v1/agents/templates/:id', authenticate, scopeGuard('read:agents', '*'), getAgentTemplate);
app.post('/api/v1/agents/from-template', authenticate, scopeGuard('write:agents', '*'), createAgentFromTemplate);
app.get('/api/v1/agents/:id/profile', authenticate, scopeGuard('read:agents', '*'), getAgentProfile);
app.get('/api/v1/agents/:id/governance-gates', authenticate, scopeGuard('read:agents', '*'), getAgentGovernanceGates);
app.get('/api/v1/agents/:id/permissions', authenticate, scopeGuard('read:agents', '*'), getAgentPermissionSets);
app.patch('/api/v1/agents/:id/permissions', authenticate, scopeGuard('write:agents', '*'), updateAgentPermissionSets);
app.post('/api/v1/agents/:id/safety-checks/run', authenticate, scopeGuard('write:agents', '*'), runAgentSafetyChecks);
app.get('/api/v1/agents/:id/safety-checks', authenticate, scopeGuard('read:agents', '*'), getAgentSafetyResults);
app.post('/api/v1/agents/:id/platform-checks/run', authenticate, scopeGuard('write:agents', '*'), runAgentPlatformChecks);
app.get('/api/v1/agents/:id/platform-checks', authenticate, scopeGuard('read:agents', '*'), getAgentPlatformCheckHistory);
app.get('/api/v1/agents/:id/incidents', authenticate, scopeGuard('read:agents', '*'), getAgentIncidents);
app.post('/api/v1/agents/:id/incidents', authenticate, scopeGuard('write:agents', '*'), createAgentIncident);
app.patch('/api/v1/agents/:id/incidents/:incidentId/resolve', authenticate, scopeGuard('write:agents', '*'), resolveAgentIncident);

// Agent Operations Routes
// Defense in depth: requireOperationsAccess guarantees every operations route
// requires at least base "view" permission at the route layer. Each handler
// additionally enforces its specific action via assertOperationsPermission +
// assertWorkspaceScope. All access uses the Supabase service role; tenant
// isolation is enforced in the API layer.
app.use('/api/v1/operations', authenticate, requireOperationsAccess);
app.get('/api/v1/operations/runs', authenticate, listAgentRuns);
app.get('/api/v1/operations/events', authenticate, subscribeOperationsEvents);
app.get('/api/v1/operations/runs/:id', authenticate, getAgentRun);
app.get('/api/v1/operations/runs/:id/timeline', authenticate, getRunTimeline);
app.post('/api/v1/operations/runs/:id/pause', authenticate, pauseRun);
app.post('/api/v1/operations/runs/:id/resume', authenticate, resumeRun);
app.post('/api/v1/operations/runs/:id/start', authenticate, startRun);
app.delete('/api/v1/operations/runs/:id', authenticate, deleteRun);
app.post('/api/v1/operations/runs/:id/stop', authenticate, stopRun);
app.post('/api/v1/operations/runs/:id/retry', authenticate, retryRun);
app.post('/api/v1/operations/runs/:id/quarantine', authenticate, quarantineRun);
app.get('/api/v1/operations/queues', authenticate, listQueues);
app.post('/api/v1/operations/queues/:id/assign', authenticate, assignQueueItem);
app.post('/api/v1/operations/queues/:id/resolve', authenticate, resolveQueueItem);
app.post('/api/v1/operations/incidents', authenticate, createIncident);
app.get('/api/v1/operations/incidents', authenticate, listIncidents);
app.patch('/api/v1/operations/incidents/:id/resolve', authenticate, resolveIncident);
app.post('/api/v1/operations/incidents/:id/postmortem', authenticate, generatePostmortem);
app.get('/api/v1/operations/incidents/:id/postmortem', authenticate, getPostmortem);
app.get('/api/v1/operations/stats', authenticate, getOperationsStats);
app.get('/api/v1/operations/evidence/:bundleId', authenticate, getRunEvidence);
app.post('/api/v1/operations/evidence/:bundleId/export', authenticate, exportEvidence);
app.post('/api/v1/operations/runs/:id/emergency-pause', authenticate, emergencyPause);
app.post('/api/v1/operations/runs/:id/hold', authenticate, holdRun);
app.post('/api/v1/operations/runs/:id/release-hold', authenticate, releaseHoldRun);
app.post('/api/v1/operations/runs/:id/escalate', authenticate, escalateRun);
app.post('/api/v1/operations/runs/:id/restricted-mode', authenticate, restrictedMode);
app.post('/api/v1/operations/runs/:id/policy-check', authenticate, runPolicyCheck);
app.get('/api/v1/operations/runs/:id/policy-results', authenticate, getPolicyResults);
app.get('/api/v1/operations/runs/:id/control-log', authenticate, getRuntimeControlLog);
app.get('/api/v1/operations/analytics', authenticate, getAnalyticsMetrics);
app.post('/api/v1/operations/analytics/export', authenticate, exportAnalyticsCSV);
app.post('/api/v1/operations/runs/:id/export-output', authenticate, exportOutputSnapshot);
app.post('/api/v1/operations/evidence', authenticate, createEvidenceBundle);
app.post('/api/v1/operations/evidence/:bundleId/lock', authenticate, lockEvidenceBundle);
app.get('/api/v1/operations/evidence', authenticate, listEvidenceBundles);

// Monitoring Routes
app.get('/api/v1/monitoring/usage',          authenticate, scopeGuard('read:analytics', '*'), getResourceUsage);
app.get('/api/v1/monitoring/quota',          authenticate, scopeGuard('read:analytics', '*'), getTokenQuota);
app.get('/api/v1/monitoring/storage-quota',  authenticate, scopeGuard('read:analytics', '*'), getStorageQuota);
app.get('/api/v1/monitoring/storage-items',  authenticate, scopeGuard('read:analytics', '*'), listStorageItems);
app.post('/api/v1/monitoring/storage-addon', authenticate, purchaseStorageAddon);

// Billing & Wallet
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.post('/api/v1/billing/webhook', stripeWebhook);
app.get('/api/v1/billing/wallet',            authenticate, getWalletData);
app.get('/api/v1/billing/wallet/balance',    authenticate, getWalletBalance);
app.put('/api/v1/billing/wallet/auto-topup', authenticate, updateAutoTopup);
app.post('/api/v1/billing/fees',             authenticate, calculateFees);
app.post('/api/v1/billing/deposit/create',        authenticate, createDepositSession);
app.post('/api/v1/billing/deposit/simulate',      authenticate, simulateDeposit);
app.post('/api/v1/billing/deposit/sync-session',  authenticate, syncDepositSession);
app.get('/api/v1/billing/spend-cap',          authenticate, getSpendCap);
app.patch('/api/v1/billing/spend-cap',        authenticate, updateSpendCap);
app.get('/api/v1/billing/overcharge',         authenticate, getOvercharge);
app.patch('/api/v1/billing/overcharge',       authenticate, updateOvercharge);
app.get('/api/v1/billing/settings',          authenticate, getBillingSettings);
app.patch('/api/v1/billing/settings',        authenticate, updateBillingSettings);
app.post('/api/v1/billing/payment-methods/setup',          authenticate, createSetupIntent);
app.post('/api/v1/billing/payment-methods/setup-checkout', authenticate, createSetupCheckout);
app.post('/api/v1/billing/payment-methods/sync-session',   authenticate, syncCardSession);
app.get('/api/v1/billing/payment-methods',                 authenticate, listPaymentMethods);
app.delete('/api/v1/billing/payment-methods/:id',          authenticate, deletePaymentMethod);
app.post('/api/v1/billing/payment-methods/:id/default',    authenticate, setDefaultPaymentMethod);
app.post('/api/v1/billing/subscribe',          authenticate, createSubscription);
app.post('/api/v1/billing/cancel-subscription', authenticate, cancelSubscription);
app.get('/api/v1/billing/subscription',        authenticate, getSubscription);
app.get('/api/v1/billing/invoices',            authenticate, listInvoices);
app.get('/api/v1/monitoring/models/performance/summary', authenticate, scopeGuard('read:analytics', '*'), getPerformanceSummary);
app.get('/api/v1/monitoring/models/performance/trends', authenticate, scopeGuard('read:analytics', '*'), getPerformanceTrends);
app.get('/api/v1/monitoring/models/performance/hallucinations', authenticate, scopeGuard('read:analytics', '*'), getHallucinationFlags);
app.get('/api/v1/monitoring/models/performance/agents', authenticate, scopeGuard('read:analytics', '*'), getAgentLeaderboard);

// SuperAdmin Routes (superadmin-only)
const superAdminGuard = requireRole('SUPERADMIN');
app.get('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.listAllOrganizations);
app.post('/api/v1/superadmin/organizations', authenticate, superAdminGuard, SuperAdminController.createOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/approve', authenticate, superAdminGuard, SuperAdminController.approveOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/pause', authenticate, superAdminGuard, SuperAdminController.pauseOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/resume', authenticate, superAdminGuard, SuperAdminController.resumeOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/restrict', authenticate, superAdminGuard, SuperAdminController.restrictOrganization);
app.post('/api/v1/superadmin/organizations/:orgId/restore', authenticate, superAdminGuard, SuperAdminController.restoreOrganization);
app.put('/api/v1/superadmin/organizations/:orgId/plan', authenticate, superAdminGuard, SuperAdminController.upgradeOrganizationPlan);
app.delete('/api/v1/superadmin/organizations/:orgId', authenticate, superAdminGuard, SuperAdminController.deleteOrganization);
app.get('/api/v1/superadmin/analytics', authenticate, superAdminGuard, SuperAdminController.getAnalytics);
app.get('/api/v1/superadmin/stats', authenticate, superAdminGuard, SuperAdminController.getPlatformStats);
app.get('/api/v1/superadmin/tickets', authenticate, superAdminGuard, SupportController.listAllTickets);
app.get('/api/v1/superadmin/tickets/count', authenticate, superAdminGuard, SupportController.countOpenTickets);
app.patch('/api/v1/superadmin/tickets/:id', authenticate, superAdminGuard, SupportController.updateTicketStatus);

// Knowledge Base Routes — Governed Knowledge Layer
// Legacy endpoints (backward compat)
app.get('/api/v1/knowledge/bases', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listBases);
app.post('/api/v1/knowledge/bases', authenticate, scopeGuard('write:content', '*'), KnowledgeController.createBase);
app.delete('/api/v1/knowledge/bases/:baseId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteBase);
app.get('/api/v1/knowledge/bases/:baseId/entries', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listEntries);
app.post('/api/v1/knowledge/bases/:baseId/entries', authenticate, scopeGuard('write:content', '*'), upload.single('file'), KnowledgeController.createEntry);
app.put('/api/v1/knowledge/entries/:entryId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.updateEntry);
app.delete('/api/v1/knowledge/entries/:entryId', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteEntry);
app.get('/api/v1/knowledge/ai-context', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getAIContext);

// Collections API (governed)
app.get('/api/v1/knowledge/collections', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listCollections);
app.get('/api/v1/knowledge/collections/:id', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getCollection);
app.post('/api/v1/knowledge/collections', authenticate, scopeGuard('write:content', '*'), KnowledgeController.createCollection);
app.patch('/api/v1/knowledge/collections/:id', authenticate, scopeGuard('write:content', '*'), KnowledgeController.updateCollection);
app.delete('/api/v1/knowledge/collections/:id', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteCollection);

// Sources API (governed)
app.get('/api/v1/knowledge/sources', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listSources);
app.get('/api/v1/knowledge/sources/:id', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getSource);
app.post('/api/v1/knowledge/collections/:collectionId/sources', authenticate, scopeGuard('write:content', '*'), upload.single('file'), KnowledgeController.createSource);
app.patch('/api/v1/knowledge/sources/:id', authenticate, scopeGuard('write:content', '*'), KnowledgeController.updateSource);
app.delete('/api/v1/knowledge/sources/:id', authenticate, scopeGuard('write:content', '*'), KnowledgeController.deleteSource);

// Source lifecycle management
app.post('/api/v1/knowledge/entries/:id/approve', authenticate, scopeGuard('write:content', '*'), KnowledgeController.approveSource);
app.post('/api/v1/knowledge/entries/:id/reject', authenticate, scopeGuard('write:content', '*'), KnowledgeController.rejectSource);
app.post('/api/v1/knowledge/entries/:id/retire', authenticate, scopeGuard('write:content', '*'), KnowledgeController.retireSource);
app.post('/api/v1/knowledge/sources/:id/approve', authenticate, scopeGuard('write:content', '*'), KnowledgeController.approveSource);
app.post('/api/v1/knowledge/sources/:id/reject', authenticate, scopeGuard('write:content', '*'), KnowledgeController.rejectSource);
app.post('/api/v1/knowledge/sources/:id/retire', authenticate, scopeGuard('write:content', '*'), KnowledgeController.retireSource);
app.post('/api/v1/knowledge/sources/:id/activate', authenticate, scopeGuard('write:content', '*'), KnowledgeController.activateSource);
app.post('/api/v1/knowledge/sources/:id/publish', authenticate, scopeGuard('write:content', '*'), KnowledgeController.publishSource);
app.post('/api/v1/knowledge/sources/:id/restrict', authenticate, scopeGuard('write:content', '*'), KnowledgeController.restrictSource);
app.post('/api/v1/knowledge/sources/:id/quarantine', authenticate, scopeGuard('write:content', '*'), KnowledgeController.quarantineSource);

// Stats
app.get('/api/v1/knowledge/stats', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getStats);

// Conflicts API
app.get('/api/v1/knowledge/conflicts', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listConflicts);

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

// Approval Workflow Routes (DEPRECATED — use /api/v1/approvals-v2/* instead)
function deprecate(req: any, res: any, next: any) {
  res.set('X-API-Deprecated', '/api/v1/approvals-v2');
  next();
}
app.post('/api/v1/approvals/submit', authenticate, deprecate, scopeGuard('write:publish', '*'), submitForReview);
app.get('/api/v1/approvals/queue', authenticate, deprecate, scopeGuard('read:governance', '*'), getApprovalQueue);
app.get('/api/v1/approvals/stats', authenticate, deprecate, scopeGuard('read:governance', '*'), getApprovalStatsLegacy);
app.post('/api/v1/approvals/items/:id/action', authenticate, deprecate, scopeGuard('write:publish', '*'), takeApprovalAction);

// ─── Approval Workbench Routes (v2 — Full 3-Panel Wireframe) ────────────
app.post('/api/v1/approvals-v2/items', authenticate, acctWrite, scopeGuard('write:governance', '*'), createApprovalItem);
app.get('/api/v1/approvals-v2/items', authenticate, acctView, scopeGuard('read:governance', '*'), listApprovalItems);
app.get('/api/v1/approvals-v2/items/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getV2ApprovalItem);
app.get('/api/v1/approvals-v2/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getV2ApprovalStats);
app.get('/api/v1/approvals-v2/items/:id/eligibility', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalEligibility);
app.post('/api/v1/approvals-v2/items/:id/action', authenticate, acctWrite, scopeGuard('write:publish', '*'), takeV2ApprovalAction);
app.patch('/api/v1/approvals-v2/items/:id/assign', authenticate, acctWrite, scopeGuard('write:governance', '*'), assignApprover);
app.patch('/api/v1/approvals-v2/items/:id/reassign', authenticate, acctWrite, scopeGuard('write:governance', '*'), reassignApprover);
app.get('/api/v1/approvals-v2/items/:id/path', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalPath);
app.post('/api/v1/approvals-v2/items/:id/path', authenticate, acctWrite, scopeGuard('write:governance', '*'), createApprovalPathHandler);
app.get('/api/v1/approvals-v2/items/:id/decisions', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalDecisions);
app.get('/api/v1/approvals-v2/items/:id/comments', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalComments);
app.post('/api/v1/approvals-v2/items/:id/comments', authenticate, acctWrite, scopeGuard('write:governance', '*'), addApprovalComment);
app.get('/api/v1/approvals-v2/items/:id/evidence', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalEvidence);
app.post('/api/v1/approvals-v2/items/:id/evidence', authenticate, acctWrite, scopeGuard('write:governance', '*'), addApprovalEvidence);
app.get('/api/v1/approvals-v2/items/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getApprovalAuditTrail);
app.post('/api/v1/approvals-v2/items/:id/export', authenticate, acctView, scopeGuard('read:governance', '*'), exportApprovalRecord);
app.post('/api/v1/approvals-v2/callbacks/:callbackId/retry', authenticate, acctWrite, scopeGuard('write:governance', '*'), retryCallback);
app.post('/api/v1/approvals-v2/bulk/:action', authenticate, acctWrite, scopeGuard('write:publish', '*'), bulkApprovalAction);

app.get('/api/v1/knowledge/conflicts/:id', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getConflict);
app.post('/api/v1/knowledge/conflicts', authenticate, scopeGuard('write:content', '*'), KnowledgeController.createConflict);
app.post('/api/v1/knowledge/conflicts/:id/resolve', authenticate, scopeGuard('write:content', '*'), KnowledgeController.resolveConflict);

// Retrieval Logs API
app.get('/api/v1/knowledge/retrieval-logs', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listRetrievalLogs);
app.post('/api/v1/knowledge/retrieval-logs', authenticate, scopeGuard('write:content', '*'), KnowledgeController.logRetrievalEvent);

// Reviews API
app.get('/api/v1/knowledge/reviews', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listReviews);

// Chunks API
app.get('/api/v1/knowledge/sources/:sourceId/chunks', authenticate, scopeGuard('read:content', '*'), KnowledgeController.listChunks);

// Search API
app.get('/api/v1/knowledge/search', authenticate, scopeGuard('read:content', '*'), KnowledgeController.searchSources);

// Access Policy API
app.get('/api/v1/knowledge/access-policy', authenticate, scopeGuard('read:content', '*'), KnowledgeController.getAccessPolicy);
app.post('/api/v1/knowledge/access-policy', authenticate, scopeGuard('write:content', '*'), KnowledgeController.upsertAccessPolicy);

// ─── Prompt Governance RBAC Guards ───────────────────────────────────────
// govView  — read-only governance operations
const govView = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'COMPLIANCE_REVIEWER', 'AUDITOR');
// govEdit  — create/edit prompt configurations
const govEdit = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT');
// govLifecycle — sensitive lifecycle operations (deploy, approve, pause, etc.)
const govLifecycle = requireRole('ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'AGENT_ARCHITECT', 'COMPLIANCE_REVIEWER');

// ─── Prompt Governance Routes ────────────────────────────────────────────
// Static routes (must come before parameterized :id routes)
app.get('/api/v1/prompts/stats', authenticate, govView, PromptController.getPromptStats);
app.get('/api/v1/prompts/approvals/stats', authenticate, govView, PromptController.getApprovalStats);
// Append-only audit trail — single record lookup (static, before :id routes)
app.get('/api/v1/prompts/audit/:auditId', authenticate, govView, PromptController.getAuditEntry);
// Reverse dependency traversal (static, MUST precede /prompts/:id to avoid shadowing)
app.get('/api/v1/prompts/dependents', authenticate, govView, PromptController.getPromptDependents);
// Dependency notification plan (static, MUST precede /prompts/:id to avoid shadowing)
app.get('/api/v1/prompts/dependency-notifications/plan', authenticate, govView, PromptController.getDependencyNotificationPlan);
// Governance dashboard rollup (static, MUST precede /prompts/:id to avoid shadowing)
app.get('/api/v1/prompts/governance-dashboard', authenticate, govView, PromptController.getGovernanceDashboard);
// Runtime trace ingestion (static, MUST precede /prompts/:id). Service-authenticated
// via API key scope; JWT users are role-gated inside the handler.
app.post('/api/v1/prompts/runtime-traces', authenticate, govEdit, scopeGuard('write:prompt_runtime_trace'), PromptController.ingestRuntimeTrace);
// Incident detail/update/close (static incidents/:incidentId, MUST precede /prompts/:id).
app.get('/api/v1/prompts/incidents/:incidentId', authenticate, govView, PromptController.getIncident);
app.patch('/api/v1/prompts/incidents/:incidentId', authenticate, govLifecycle, PromptController.updateIncident);
app.post('/api/v1/prompts/incidents/:incidentId/close', authenticate, govLifecycle, PromptController.closeIncident);

// Versions sub-routes (no :id prefix)
app.post('/api/v1/prompts/versions/:versionId/approve', authenticate, govLifecycle, PromptController.approveVersion);
app.post('/api/v1/prompts/versions/:versionId/reject', authenticate, govLifecycle, PromptController.rejectVersion);
// A6 — Waive outstanding review requirements with justification (admin override gated in-handler)
app.post('/api/v1/prompts/versions/:versionId/waive', authenticate, govLifecycle, PromptController.waiveApproval);
app.post('/api/v1/prompts/versions/:versionId/deploy', authenticate, govLifecycle, PromptController.deployVersion);
app.get('/api/v1/prompts/versions/:versionId/tests/runs', authenticate, govView, PromptController.listTestRuns);
app.post('/api/v1/prompts/versions/:versionId/tests/run', authenticate, govEdit, PromptController.runTests);
app.get('/api/v1/prompts/versions/:versionId/approvals', authenticate, govView, PromptController.listApprovals);
app.get('/api/v1/prompts/versions/:versionId/deployments', authenticate, govView, PromptController.listDeployments);
app.get('/api/v1/prompts/versions/:versionId/bindings', authenticate, govEdit, PromptController.listBindings);
app.post('/api/v1/prompts/versions/:versionId/bindings', authenticate, govEdit, PromptController.createBinding);
app.get('/api/v1/prompts/versions/:versionId/knowledge', authenticate, govEdit, PromptController.listKnowledgeBindings);
app.post('/api/v1/prompts/versions/:versionId/knowledge', authenticate, govEdit, PromptController.createKnowledgeBinding);
app.get('/api/v1/prompts/versions/:versionId/tools', authenticate, govEdit, PromptController.listToolPermissions);
app.post('/api/v1/prompts/versions/:versionId/tools', authenticate, govEdit, PromptController.createToolPermission);
app.get('/api/v1/prompts/versions/:versionId/graph', authenticate, govView, PromptController.getPromptVersionGraph);
app.get('/api/v1/prompts/versions/:versionId/dependency-health', authenticate, govView, PromptController.getPromptVersionDependencyHealth);
app.get('/api/v1/prompts/versions/:versionId/impact', authenticate, govView, PromptController.getPromptVersionImpact);
app.get('/api/v1/prompts/versions/:versionId/runtime-traces', authenticate, govView, PromptController.listVersionRuntimeTraces);
// Dependency binding edits (update / delete) — addressed by binding id, tenant-scoped
app.patch('/api/v1/prompts/bindings/:bindingId', authenticate, govEdit, PromptController.updateBinding);
app.delete('/api/v1/prompts/bindings/:bindingId', authenticate, govEdit, PromptController.deleteBinding);
app.patch('/api/v1/prompts/knowledge-bindings/:bindingId', authenticate, govEdit, PromptController.updateKnowledgeBinding);
app.delete('/api/v1/prompts/knowledge-bindings/:bindingId', authenticate, govEdit, PromptController.deleteKnowledgeBinding);
app.patch('/api/v1/prompts/tool-permissions/:permissionId', authenticate, govEdit, PromptController.updateToolPermission);
app.delete('/api/v1/prompts/tool-permissions/:permissionId', authenticate, govEdit, PromptController.deleteToolPermission);

// Prompt CRUD (parameterized :id routes)
app.get('/api/v1/prompts', authenticate, govView, PromptController.listPrompts);
app.post('/api/v1/prompts', authenticate, govEdit, PromptController.createPrompt);
// A1 — Import a prompt definition (static, MUST precede /prompts/:id routes)
app.post('/api/v1/prompts/import', authenticate, govEdit, PromptController.importPrompt);
app.get('/api/v1/prompts/:id', authenticate, govView, PromptController.getPrompt);
app.get('/api/v1/prompts/:id/graph', authenticate, govView, PromptController.getPromptGraph);
app.get('/api/v1/prompts/:id/dependency-health', authenticate, govView, PromptController.getPromptDependencyHealth);
app.get('/api/v1/prompts/:id/impact', authenticate, govView, PromptController.getPromptImpact);
app.get('/api/v1/prompts/:id/governance-snapshot', authenticate, govView, PromptController.getPromptGovernanceSnapshot);
app.patch('/api/v1/prompts/:id', authenticate, govEdit, PromptController.updatePrompt);
app.post('/api/v1/prompts/:id/clone', authenticate, govEdit, PromptController.clonePrompt);
// A1 — Create a new draft from an approved prompt used as a template
app.post('/api/v1/prompts/:id/template', authenticate, govEdit, PromptController.createFromTemplate);

// Lifecycle actions
app.post('/api/v1/prompts/:id/pause', authenticate, govLifecycle, PromptController.pausePrompt);
app.post('/api/v1/prompts/:id/resume', authenticate, govLifecycle, PromptController.resumePrompt);
app.post('/api/v1/prompts/:id/archive', authenticate, govLifecycle, PromptController.archivePrompt);
app.post('/api/v1/prompts/:id/retire', authenticate, govLifecycle, PromptController.retirePrompt);
app.post('/api/v1/prompts/:id/submit-review', authenticate, govLifecycle, PromptController.submitForReview);
app.post('/api/v1/prompts/:id/rollback', authenticate, govLifecycle, PromptController.rollbackPrompt);

// Evidence Vault — immutable evidence chain for a prompt
app.get('/api/v1/prompts/:id/evidence', authenticate, govView, PromptController.listPromptEvidence);

// Evidence Export — sealed, reason-stamped export package (permission-gated)
app.post('/api/v1/prompts/:id/evidence/export', authenticate, govView, PromptController.createPromptEvidenceExport);
app.get('/api/v1/prompts/:id/evidence/export/:exportId', authenticate, govView, PromptController.getPromptEvidenceExport);

// Runtime Evidence — runtime traces for a prompt (read-only, workspace-scoped)
app.get('/api/v1/prompts/:id/runtime-traces', authenticate, govView, PromptController.listPromptRuntimeTraces);

// Prompt Incidents — open (governance roles) + list (workspace-scoped)
app.post('/api/v1/prompts/:id/incidents', authenticate, govLifecycle, PromptController.createIncident);
app.get('/api/v1/prompts/:id/incidents', authenticate, govView, PromptController.listPromptIncidents);

// Append-only Audit Trail — governance ledger for a prompt (read-only)
app.get('/api/v1/prompts/:id/audit', authenticate, govView, PromptController.listPromptAudit);
app.get('/api/v1/prompts/:id/audit/timeline', authenticate, govView, PromptController.getPromptAuditTimeline);

// Versions (under :id)
app.get('/api/v1/prompts/:id/versions', authenticate, govView, PromptController.listVersions);
app.post('/api/v1/prompts/:id/versions', authenticate, govEdit, PromptController.createVersion);
app.get('/api/v1/prompts/:id/versions/:versionId', authenticate, govView, PromptController.getVersion);

// Tests (under :id)
app.get('/api/v1/prompts/:id/tests/suites', authenticate, govView, PromptController.listTestSuites);
app.post('/api/v1/prompts/:id/tests/suites', authenticate, govEdit, PromptController.createTestSuite);

// Drift Monitoring (Phase 5B) — on-demand governance compliance analysis
app.post('/api/v1/prompts/:id/drift/scan', authenticate, govView, PromptController.scanPromptDrift);
app.get('/api/v1/prompts/drift/summary', authenticate, govView, PromptController.getDriftSummary);
app.post('/api/v1/prompts/drift/resolve', authenticate, govLifecycle, PromptController.resolveDrift);

// Adversarial Testing (Phase 5C) — deterministic attack-surface analysis
app.get('/api/v1/prompts/:id/tests/suites/:suiteId/adversarial/scenarios', authenticate, govView, PromptController.listAdversarialScenarios);
app.post('/api/v1/prompts/:id/tests/suites/:suiteId/adversarial/scenarios', authenticate, govEdit, PromptController.createAdversarialScenario);
app.put('/api/v1/prompts/:id/tests/suites/:suiteId/adversarial/scenarios/:scenarioId', authenticate, govEdit, PromptController.updateAdversarialScenario);
app.delete('/api/v1/prompts/:id/tests/suites/:suiteId/adversarial/scenarios/:scenarioId', authenticate, govEdit, PromptController.deleteAdversarialScenario);
app.post('/api/v1/prompts/:id/tests/suites/:suiteId/adversarial/scenarios/seed', authenticate, govEdit, PromptController.seedDefaultAdversarialScenarios);
app.post('/api/v1/prompts/versions/:versionId/tests/adversarial/run', authenticate, govEdit, PromptController.runAdversarialTests);
app.get('/api/v1/prompts/versions/:versionId/tests/adversarial/runs', authenticate, govView, PromptController.listAdversarialResults);
app.get('/api/v1/prompts/versions/:versionId/tests/adversarial/runs/:runId', authenticate, govView, PromptController.getAdversarialResultDetail);
// Phase 6.2 — Real adversarial attack execution
app.post('/api/v1/prompts/versions/:versionId/tests/adversarial/real', authenticate, govEdit, PromptController.runRealAdversarialSuite);

// Policy Simulation (Phase 5D) — read-only what-if analysis
app.post('/api/v1/prompts/simulate', authenticate, govView, PromptController.runPolicySimulation);
app.post('/api/v1/prompts/:id/simulate', authenticate, govView, PromptController.runPromptPolicySimulation);

// Prompt Scorecards (Phase 5E) — structured health scores
app.get('/api/v1/prompts/scorecards', authenticate, govView, PromptController.listPromptScorecards);
app.get('/api/v1/prompts/:id/scorecard', authenticate, govView, PromptController.getPromptScorecard);

// Governance Metrics Dashboard (Phase 5F) — lean live-computed pipeline
app.get('/api/v1/prompts/metrics/dashboard', authenticate, govView, PromptController.getGovernanceMetrics);

// Evaluation Intelligence Dashboard Views (Phase 6.5)
app.get('/api/v1/prompts/dashboard/evaluation', authenticate, govView, PromptController.getEvaluationView);
app.get('/api/v1/prompts/dashboard/adversarial', authenticate, govView, PromptController.getAdversarialView);
app.get('/api/v1/prompts/dashboard/drift', authenticate, govView, PromptController.getDriftView);

// ─── Prompt Evaluation (Phase 1) ─────────────────────────────────────
app.post('/api/v1/prompts/versions/:versionId/evaluate', authenticate, govLifecycle, PromptController.evaluatePromptVersion);

// ─── Constraint Shadow (Phase 2) ─────────────────────────────────────
app.get('/api/v1/prompts/:id/constraint-shadow', authenticate, govView, PromptController.getConstraintShadow);
app.post('/api/v1/prompts/:id/constraint-shadow/lock', authenticate, govLifecycle, PromptController.lockConstraintShadow);

// ─── Variable Management (Phase 2) ───────────────────────────────────
app.get('/api/v1/prompts/versions/:versionId/variables', authenticate, govView, PromptController.getPromptVariables);
app.put('/api/v1/prompts/versions/:versionId/variables', authenticate, govEdit, PromptController.updatePromptVariables);
app.post('/api/v1/prompts/versions/:versionId/variables/validate', authenticate, govView, PromptController.validatePromptVariables);

// ─── Guardrail Authoring (A2) ────────────────────────────────────────
app.put('/api/v1/prompts/versions/:versionId/guardrails', authenticate, govEdit, PromptController.updatePromptGuardrails);

// ─── Parameter Policy (Phase 2) ──────────────────────────────────────
app.post('/api/v1/prompts/:id/parameter-policy/evaluate', authenticate, govView, PromptController.evaluateParameterPolicy);

// ─── Runtime Variable Governance (Phase 2) ───────────────────────────
app.post('/api/v1/prompts/versions/:versionId/runtime-governance', authenticate, govEdit, PromptController.enforceRuntimeGovernance);

// ─── Prompt Defensibility Index / PDI (Phase 3) ──────────────────────
app.get('/api/v1/prompts/:id/pdi', authenticate, govView, PromptController.computePDI);

// Phase 6.3 — Real cross-model evaluation (4 providers, 6 metrics)
app.post('/api/v1/prompts/versions/:versionId/cross-model/real', authenticate, govView, PromptController.runRealCrossModelComparison);

// ─── Governance Receipt (Phase 4) ────────────────────────────────────
app.post('/api/v1/prompts/:id/receipt', authenticate, govLifecycle, PromptController.generateGovernanceReceipt);

// ─── Commissioning (Phase 5) ─────────────────────────────────────────
app.post('/api/v1/prompts/:id/commission/preflight', authenticate, govLifecycle, PromptController.runCommissionPreflight);
app.post('/api/v1/prompts/:id/commission', authenticate, govLifecycle, PromptController.commissionPrompt);

// ─── Separation of Duties (Phase 7) ──────────────────────────────────
app.post('/api/v1/prompts/versions/:versionId/sod/check', authenticate, govView, PromptController.checkSeparationOfDuties);

// ─── Delegation (Phase 7) ────────────────────────────────────────────
app.post('/api/v1/prompts/versions/:versionId/delegate', authenticate, govEdit, PromptController.delegateApproval);

// ─── Escalation (Phase 7) ────────────────────────────────────────────
app.post('/api/v1/prompts/versions/:versionId/escalate', authenticate, govEdit, PromptController.escalateApproval);

// ─── Three-Key Approval (Phase 7) ────────────────────────────────────
app.post('/api/v1/prompts/versions/:versionId/three-key/initialize', authenticate, govLifecycle, PromptController.initializeThreeKey);
app.post('/api/v1/prompts/versions/:versionId/three-key/submit', authenticate, govLifecycle, PromptController.submitThreeKey);
app.get('/api/v1/prompts/versions/:versionId/three-key/status', authenticate, govView, PromptController.getThreeKeyStatus);

// ─── Per-version sealed hash history (read-only, Phase 5.C) ──────────────
app.get('/api/v1/prompts/versions/:versionId/sealed-history', authenticate, govView, PromptController.getVersionSealedHistory);

// ─── Approval Rules Routes ───────────────────────────────────────────
app.get('/api/v1/governance/rules', authenticate, acctView, scopeGuard('read:governance', '*'), listRules);
app.post('/api/v1/governance/rules', authenticate, acctWrite, scopeGuard('write:governance', '*'), createRule);
app.post('/api/v1/governance/rules/ai-suggest', authenticate, acctWrite, scopeGuard('write:governance', '*'), suggestKeywords);
app.get('/api/v1/governance/rules/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleStats);
app.get('/api/v1/governance/rules/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getRule);
app.delete('/api/v1/governance/rules/:id', authenticate, acctWrite, scopeGuard('write:governance', '*'), deleteRule);
app.patch('/api/v1/governance/rules/:id', authenticate, acctWrite, scopeGuard('write:governance', '*'), updateRule);
app.post('/api/v1/governance/rules/:id/submit-review', authenticate, acctWrite, scopeGuard('write:governance', '*'), submitRuleForReview);
app.post('/api/v1/governance/rules/:id/publish', authenticate, acctWrite, scopeGuard('write:governance', '*'), publishRule);
app.post('/api/v1/governance/rules/:id/deactivate', authenticate, acctWrite, scopeGuard('write:governance', '*'), deactivateRule);
app.post('/api/v1/governance/rules/:id/reactivate', authenticate, acctWrite, scopeGuard('write:governance', '*'), reactivateRule);
app.post('/api/v1/governance/rules/:id/archive', authenticate, acctWrite, scopeGuard('write:governance', '*'), archiveRule);
app.post('/api/v1/governance/rules/:id/clone', authenticate, acctWrite, scopeGuard('write:governance', '*'), cloneRule);
app.get('/api/v1/governance/rules/:id/scope', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleScope);
app.put('/api/v1/governance/rules/:id/scope', authenticate, acctWrite, scopeGuard('write:governance', '*'), upsertRuleScope);
app.get('/api/v1/governance/rules/:id/path', authenticate, acctView, scopeGuard('read:governance', '*'), getRulePath);
app.put('/api/v1/governance/rules/:id/path', authenticate, acctWrite, scopeGuard('write:governance', '*'), upsertRulePath);
app.get('/api/v1/governance/rules/:id/versions', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleVersions);
app.get('/api/v1/governance/rules/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleAuditLog);
app.get('/api/v1/governance/rules/:id/conflicts', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleConflicts);
app.post('/api/v1/governance/rules/:id/conflicts/detect', authenticate, acctWrite, scopeGuard('write:governance', '*'), detectRuleConflicts);
app.post('/api/v1/governance/rules/conflicts/:conflictId/resolve', authenticate, acctWrite, scopeGuard('write:governance', '*'), resolveRuleConflict);
app.post('/api/v1/governance/rules/:id/simulate', authenticate, acctWrite, scopeGuard('write:governance', '*'), runRuleSimulation);

// Additional Approval Rules endpoints
app.get('/api/v1/governance/rules/:id/details', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleDetails);
app.get('/api/v1/governance/rules/:id/stages', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleStagesHandler);
app.get('/api/v1/governance/rules/:id/escalations', authenticate, acctView, scopeGuard('read:governance', '*'), getRuleEscalationsHandler);
app.post('/api/v1/governance/rules/:id/mark-ready', authenticate, acctWrite, scopeGuard('write:governance', '*'), markRuleReadyToPublish);
app.post('/api/v1/governance/rules/:id/mark-invalid', authenticate, acctWrite, scopeGuard('write:governance', '*'), markRuleInvalid);

// ─── Review Queue Routes (Accountability Layer) ──────────────────────
app.post('/api/v1/review-queue', authenticate, acctWrite, scopeGuard('write:governance', '*'), createReviewItem);
app.get('/api/v1/review-queue', authenticate, acctView, scopeGuard('read:governance', '*'), listReviewItems);
app.get('/api/v1/review-queue/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewStats);
app.get('/api/v1/review-queue/items/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewItem);
app.post('/api/v1/review-queue/items/:id/action', authenticate, acctWrite, scopeGuard('write:publish', '*'), takeReviewAction);
app.get('/api/v1/review-queue/items/:id/eligibility', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewEligibility);
app.get('/api/v1/review-queue/items/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewAuditLog);
app.get('/api/v1/review-queue/items/:id/validation', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewValidation);
app.get('/api/v1/review-queue/items/:id/policy-flags', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewPolicyFlags);
app.get('/api/v1/review-queue/items/:id/notes', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewNotesHandler);
app.get('/api/v1/review-queue/items/:id/revision-history', authenticate, acctView, scopeGuard('read:governance', '*'), getReviewRevisionHistory);
app.patch('/api/v1/review-queue/items/:id/assign', authenticate, acctWrite, scopeGuard('write:governance', '*'), assignReviewItemHandler);
app.post('/api/v1/review-queue/items/:id/notes', authenticate, acctWrite, scopeGuard('write:governance', '*'), addReviewNoteHandler);
app.post('/api/v1/review-queue/bulk/:action', authenticate, acctWrite, scopeGuard('write:publish', '*'), bulkReviewAction);

// ─── Quality Audit Routes (Accountability Layer) ─────────────────────
app.get('/api/v1/quality-audit/items', authenticate, acctView, scopeGuard('read:governance', '*'), listAuditItems);
app.get('/api/v1/quality-audit/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getQaAuditStats);
app.get('/api/v1/quality-audit/items/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditItem);
app.post('/api/v1/quality-audit/generate-sample', authenticate, acctWrite, scopeGuard('write:governance', '*'), generateSample);
app.post('/api/v1/quality-audit/items/:id/start', authenticate, acctWrite, scopeGuard('write:governance', '*'), startAudit);
app.post('/api/v1/quality-audit/items/:id/pass', authenticate, acctWrite, scopeGuard('write:governance', '*'), passAudit);
app.post('/api/v1/quality-audit/items/:id/fail', authenticate, acctWrite, scopeGuard('write:governance', '*'), failAudit);
app.post('/api/v1/quality-audit/items/:id/needs-correction', authenticate, acctWrite, scopeGuard('write:governance', '*'), needsCorrection);
app.post('/api/v1/quality-audit/items/:id/escalate', authenticate, acctWrite, scopeGuard('write:governance', '*'), escalateAudit);
app.post('/api/v1/quality-audit/items/:id/close', authenticate, acctWrite, scopeGuard('write:governance', '*'), closeAudit);
app.post('/api/v1/quality-audit/items/:id/assign', authenticate, acctWrite, scopeGuard('write:governance', '*'), assignAuditorToItem);
app.post('/api/v1/quality-audit/items/:id/scorecard', authenticate, acctWrite, scopeGuard('write:governance', '*'), saveScorecard);
app.post('/api/v1/quality-audit/items/:id/scorecard/override', authenticate, acctWrite, scopeGuard('write:governance', '*'), overrideScorecard);
app.post('/api/v1/quality-audit/items/:id/defects', authenticate, acctWrite, scopeGuard('write:governance', '*'), addDefect);
app.post('/api/v1/quality-audit/defects/:defectId/resolve', authenticate, acctWrite, scopeGuard('write:governance', '*'), resolveDefect);
app.post('/api/v1/quality-audit/items/:id/corrective-actions', authenticate, acctWrite, scopeGuard('write:governance', '*'), addCorrectiveAction);
app.patch('/api/v1/quality-audit/corrective-actions/:actionId', authenticate, acctWrite, scopeGuard('write:governance', '*'), updateCorrectiveAction);
app.post('/api/v1/quality-audit/items/:id/notes', authenticate, acctWrite, scopeGuard('write:governance', '*'), addQaNote);
app.post('/api/v1/quality-audit/items/:id/evidence', authenticate, acctWrite, scopeGuard('write:governance', '*'), addQaEvidence);
app.post('/api/v1/quality-audit/items/:id/retry-callback', authenticate, acctWrite, scopeGuard('write:governance', '*'), retryQaCallbackByItem);
app.get('/api/v1/quality-audit/items/:id/defects', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditDefects);
app.get('/api/v1/quality-audit/items/:id/corrective-actions', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditCorrectiveActions);
app.get('/api/v1/quality-audit/items/:id/notes', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditNotes);
app.get('/api/v1/quality-audit/items/:id/evidence', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditEvidence);
app.get('/api/v1/quality-audit/items/:id/eligibility', authenticate, acctView, scopeGuard('read:governance', '*'), getAuditEligibility);
app.get('/api/v1/quality-audit/items/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getQaAuditTrail);
app.post('/api/v1/quality-audit/callbacks/:callbackId/retry', authenticate, acctWrite, scopeGuard('write:governance', '*'), retryQaCallback);
app.post('/api/v1/quality-audit/export/findings', authenticate, acctView, scopeGuard('read:governance', '*'), exportQaFindings);
app.post('/api/v1/quality-audit/export/evidence', authenticate, acctView, scopeGuard('read:governance', '*'), exportQaEvidence);

// ─── Validation Desk Routes (Accountability Layer) ───────────────────
app.post('/api/v1/validation/items', authenticate, acctWrite, scopeGuard('write:governance', '*'), createValidationItem);
app.get('/api/v1/validation/items', authenticate, acctView, scopeGuard('read:governance', '*'), listValidationItems);
app.get('/api/v1/validation/stats', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationStats);
app.get('/api/v1/validation/items/:id', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationItem);
app.get('/api/v1/validation/items/:id/eligibility', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationEligibility);
app.get('/api/v1/validation/items/:id/audit-log', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationAuditTrail);
app.post('/api/v1/validation/items/:id/assign', authenticate, acctWrite, scopeGuard('write:governance', '*'), assignValidator);
app.post('/api/v1/validation/items/:id/run', authenticate, acctWrite, scopeGuard('write:governance', '*'), runValidation);
app.get('/api/v1/validation/runs/:runId/results', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationRunResults);
app.post('/api/v1/validation/items/:id/revalidate', authenticate, acctWrite, scopeGuard('write:governance', '*'), revalidateItem);
app.post('/api/v1/validation/items/:id/request-revision', authenticate, acctWrite, scopeGuard('write:governance', '*'), requestRevision);
app.post('/api/v1/validation/items/:id/return-to-creator', authenticate, acctWrite, scopeGuard('write:governance', '*'), returnToCreator);
app.post('/api/v1/validation/items/:id/send-to-review-queue', authenticate, acctWrite, scopeGuard('write:governance', '*'), sendToReviewQueue);
app.post('/api/v1/validation/items/:id/send-to-approvals', authenticate, acctWrite, scopeGuard('write:governance', '*'), sendToApprovals);
app.post('/api/v1/validation/items/:id/escalate', authenticate, acctWrite, scopeGuard('write:governance', '*'), escalateValidation);
app.post('/api/v1/validation/items/:id/override', authenticate, acctWrite, scopeGuard('write:governance', '*'), applyOverride);
app.post('/api/v1/validation/items/:id/block', authenticate, acctWrite, scopeGuard('write:governance', '*'), blockItem);
app.post('/api/v1/validation/items/:id/complete-manual-check', authenticate, acctWrite, scopeGuard('write:governance', '*'), completeManualCheck);
app.post('/api/v1/validation/items/:id/notes', authenticate, acctWrite, scopeGuard('write:governance', '*'), addValidatorNote);
app.get('/api/v1/validation/items/:id/notes', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationNotesList);
app.get('/api/v1/validation/items/:id/runs', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationRuns);
app.get('/api/v1/validation/items/:id/grounding', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationGrounding);
app.get('/api/v1/validation/items/:id/manual-check', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationManualChecks);
app.get('/api/v1/validation/items/:id/approval-readiness', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationApprovalReadiness);
app.get('/api/v1/validation/items/:id/rule-history', authenticate, acctView, scopeGuard('read:governance', '*'), getValidationRuleHistory);
app.get('/api/v1/validation/items/:id/export', authenticate, acctView, scopeGuard('read:governance', '*'), exportValidationRecord);
app.post('/api/v1/validation/callbacks/:callbackId/retry', authenticate, acctWrite, scopeGuard('write:governance', '*'), retryValidationCallback);

// Support Routes
app.post('/api/v1/support/tickets', authenticate, SupportController.submitTicket);

// ─── Inbox & Engagement Routes ───────────────────────────────────────────────
import {
  listInboxMessages, getInboxMessage, createReply, generateAiDraft, sendReply,
  assignMessage, updateMessageStatus, escalateMessage, getEscalationQueue,
  resolveEscalation, addNote as addInboxNote, deleteInboxMessages, archiveMessage,
  getMessageAudit, syncPlatformMessages, getPostPreview,
} from './domains/inbox/inboxController';
import { verifyMetaWebhook, handleMetaWebhook } from './domains/inbox/inboxWebhook';
import {
  listAutoReplyRules, createAutoReplyRule, updateAutoReplyRule, deleteAutoReplyRule,
} from './domains/inbox/inboxSettingsController';

// Static routes before parameterized :id routes
app.get('/api/v1/inbox/settings/auto-reply',           authenticate, listAutoReplyRules);
app.post('/api/v1/inbox/settings/auto-reply',          authenticate, createAutoReplyRule);
app.patch('/api/v1/inbox/settings/auto-reply/:id',     authenticate, updateAutoReplyRule);
app.post('/api/v1/inbox/settings/auto-reply/:id/delete', authenticate, deleteAutoReplyRule);
app.get('/api/v1/inbox/messages',                      authenticate, listInboxMessages);
app.post('/api/v1/inbox/messages/delete',              authenticate, deleteInboxMessages);
app.get('/api/v1/inbox/escalations',                   authenticate, getEscalationQueue);
app.post('/api/v1/inbox/escalations/:escalationId/resolve', authenticate, resolveEscalation);
app.post('/api/v1/inbox/sync',                         authenticate, syncPlatformMessages);
app.get('/api/v1/inbox/messages/:id',                  authenticate, getInboxMessage);
app.post('/api/v1/inbox/messages/:id/reply',           authenticate, createReply);
app.post('/api/v1/inbox/messages/:id/reply/generate',  authenticate, generateAiDraft);
app.post('/api/v1/inbox/messages/:replyId/reply/send', authenticate, sendReply);
app.post('/api/v1/inbox/messages/:id/assign',          authenticate, assignMessage);
app.patch('/api/v1/inbox/messages/:id/status',         authenticate, updateMessageStatus);
app.post('/api/v1/inbox/messages/:id/escalate',        authenticate, escalateMessage);
app.post('/api/v1/inbox/messages/:id/archive',         authenticate, archiveMessage);
app.post('/api/v1/inbox/messages/:id/notes',           authenticate, addInboxNote);
app.get('/api/v1/inbox/messages/:id/audit',            authenticate, getMessageAudit);
app.get('/api/v1/inbox/messages/:id/post-preview',     authenticate, getPostPreview);
// Meta webhook endpoints (no auth — verified by hub.verify_token / X-Hub-Signature-256)
app.get('/api/v1/inbox/webhook/meta',  verifyMetaWebhook);
app.post('/api/v1/inbox/webhook/meta', handleMetaWebhook);



// Global Error Handler
app.use(errorHandler);

import { initWorker } from './workers/schedulerWorker';
import { initAuditExportWorker } from './workers/auditExportWorker';
import { initAuditIntegrityWorker } from './workers/auditIntegrityWorker';
import { initAuditStreamingWorker } from './workers/auditStreamingWorker';
import { initVaultWorker, initDlpScanWorker } from './workers/vaultWorker';
import { startCampaignWorker } from './workers/campaignWorker';
import { initOrgInactivityWorker } from './workers/orgInactivityWorker';
import { startSlaBreachWorker } from './workers/slaBreachWorker';
import { initEvidenceIntelligenceWorker } from './workers/evidenceIntelligenceWorker';
// ─── Start Server ─────────────────────────────────────────────────────────────
try {
  registerExecutionListeners();
  registerEventBridge();
  // Phase 6.2 / 6.3 — wire real LLM providers into the ModelExecutionAdapter
  // registry. Missing keys ⇒ providers skipped (NullAdapter fallback).
  // PROMPT_GOVERNANCE_ENFORCED=true + zero keys ⇒ boot fails.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require so env (provider keys) is loaded before adapter registration
  const { registerProductionAdapters } = require('./modules/prompts/modelProviders');
  registerProductionAdapters();
  const server = app.listen(port, () => {
    logger.info(`[server]: ZoikoVertex backend running in ${env.NODE_ENV} mode at http://localhost:${port}`);
    // Start background workers
    initWorker();
    initAuditExportWorker();
    initAuditIntegrityWorker();
    initAuditStreamingWorker();
    initVaultWorker();
    initDlpScanWorker();
    startCampaignWorker();
    initOrgInactivityWorker();
    startSlaBreachWorker();
    initEvidenceIntelligenceWorker();
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
