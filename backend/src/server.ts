import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';

// Controllers
import { provisionUser } from './modules/identity/identityController';
import { generateContent, analyzeImage } from './modules/intelligence/intelligenceController';
import { transitionStatus, submitIntent } from './modules/governance/governanceController';
import { handleFacebookCallback, handleLinkedInCallback, handlePinterestCallback, handleThreadsCallback } from './modules/social/socialController';

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
app.post('/api/v1/users/provision', provisionUser);
app.post('/api/v1/ai/generate', generateContent);
app.post('/api/v1/ai/analyze-image', analyzeImage);
app.post('/api/v1/governance/transition', transitionStatus);
app.post('/api/v1/governance/submit', submitIntent);
app.get('/api/auth/facebook/callback', handleFacebookCallback);
app.get('/api/auth/linkedin/callback', handleLinkedInCallback);
app.get('/api/auth/pinterest/callback', handlePinterestCallback);
app.get('/api/auth/threads/callback', handleThreadsCallback);

// Global Error Handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
try {
  const server = app.listen(port, () => {
    logger.info(`[server]: ZoikoVertex backend running in ${env.NODE_ENV} mode at http://localhost:${port}`);
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
