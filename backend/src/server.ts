import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';

// Controllers
import { provisionUser } from './modules/identity/identityController';
import { generateContent, analyzeImage } from './modules/intelligence/intelligenceController';
import { transitionStatus, submitIntent, deleteIntent, listIntents, getQueue } from './modules/governance/governanceController';
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback, disconnectAccount } from './modules/social/socialController';
import { getRecommendations, schedulePost, cancelScheduledPost, listScheduledPosts, updateScheduledPost, getScheduledPost } from './modules/scheduler/schedulerController';
import { listLibrary, addToLibrary, deleteFromLibrary } from './modules/library/libraryController';
import { SuperAdminController } from './modules/superadmin/superAdminController';
import { SupportController } from './modules/support/supportController';
import { getUserContext } from './modules/user/userController';
import { listAccounts } from './modules/social/accountsController';
import { listMembers, listRequests, createRequest, updateRequest } from './modules/team/teamController';

import { authenticate } from './shared/authMiddleware';

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
app.post('/api/v1/users/provision', provisionUser); // Usually needs its own internal secret or admin auth

// Protected Intelligence/AI
app.post('/api/v1/ai/generate', authenticate, generateContent);
app.post('/api/v1/ai/analyze-image', authenticate, analyzeImage);

// Protected Governance
app.post('/api/v1/governance/transition', authenticate, transitionStatus);
app.post('/api/v1/governance/submit', authenticate, submitIntent);
app.get('/api/v1/governance/intents', authenticate, listIntents);
app.get('/api/v1/governance/queue', authenticate, getQueue);
app.delete('/api/v1/governance/intents/:id', authenticate, deleteIntent);

// Public OAuth (They handle their own security via state)
app.get('/api/auth/facebook/callback', handleFacebookCallback);
app.get('/api/auth/linkedin/callback', handleLinkedInCallback);
app.get('/api/auth/pinterest/callback', handlePinterestCallback);
app.get('/api/auth/threads/callback', handleThreadsCallback);

// Protected Social/Account Routes
app.delete('/api/v1/accounts/:id', authenticate, disconnectAccount);

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

// ─── SuperAdmin Routes ───────────────────────────────────────────────────────
app.post('/api/v1/superadmin/organizations', authenticate, SuperAdminController.createOrganization);
app.get('/api/v1/superadmin/organizations', authenticate, SuperAdminController.listAllOrganizations);
app.get('/api/v1/superadmin/stats', authenticate, SuperAdminController.getPlatformStats);
app.get('/api/v1/superadmin/tickets', authenticate, SupportController.listAllTickets);
app.patch('/api/v1/superadmin/tickets/:id', authenticate, SupportController.updateTicketStatus);

// ─── Support Routes ──────────────────────────────────────────────────────────
app.post('/api/v1/support/tickets', authenticate, SupportController.submitTicket);

// Global Error Handler
app.use(errorHandler);

import { initWorker } from './workers/schedulerWorker';
import { registerExecutionListeners } from './modules/social/executionService';

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
