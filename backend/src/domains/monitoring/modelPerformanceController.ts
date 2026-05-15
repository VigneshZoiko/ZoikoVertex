import { Request, Response, NextFunction } from 'express';

/**
 * GET /api/v1/monitoring/models/performance/summary
 * Returns high-level metrics for the entire agent fleet.
 */
export const getPerformanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, this would aggregate metrics from an analytics database
    const summaryData = {
      globalAccuracy: 94.2, // percentage
      accuracyTrend: 1.5, // percent change
      failureRate: 2.1, // percentage
      failureRateTrend: -0.3, // percent change
      hallucinationFlags: 14, // count last 24h
      hallucinationTrend: -2, // count change
      escalationRate: 4.8, // percentage of sessions escalated to humans
      escalationTrend: 0.5, // percent change
    };

    res.status(200).json({ success: true, data: summaryData });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/monitoring/models/performance/trends
 * Returns time-series data for the last 24 hours (accuracy, drift, overrides).
 */
export const getPerformanceTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = 24;
    const trends = [];
    let currentAccuracy = 92.0;
    let currentDrift = 1.0;
    let currentOverride = 3.0;

    // Generate mock time-series data
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - i);
      timestamp.setMinutes(0, 0, 0);

      // Random walk for realism
      currentAccuracy = Math.min(100, Math.max(85, currentAccuracy + (Math.random() * 2 - 1)));
      currentDrift = Math.max(0, currentDrift + (Math.random() * 0.4 - 0.2));
      currentOverride = Math.max(0, currentOverride + (Math.random() * 1 - 0.5));

      trends.push({
        timestamp: timestamp.toISOString(),
        accuracy: parseFloat(currentAccuracy.toFixed(2)),
        driftSignal: parseFloat(currentDrift.toFixed(2)),
        humanOverride: parseFloat(currentOverride.toFixed(2)),
      });
    }

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/monitoring/models/performance/hallucinations
 * Returns a list of recently flagged hallucinations/low-quality outputs.
 */
export const getHallucinationFlags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hallucinations = [
      {
        id: 'flag-1',
        agentName: 'Customer Support Bot',
        severity: 'HIGH',
        triggerContext: 'Refund policy inquiry',
        flaggedOutput: 'We offer full refunds within 365 days of purchase.',
        correctedOutput: 'We offer full refunds within 30 days of purchase.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: 'Investigating'
      },
      {
        id: 'flag-2',
        agentName: 'Sales Development Rep',
        severity: 'MEDIUM',
        triggerContext: 'Pricing clarification',
        flaggedOutput: 'The enterprise plan is $5/month.',
        correctedOutput: 'The enterprise plan pricing is custom, starting at $500/month.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        status: 'Resolved'
      },
      {
        id: 'flag-3',
        agentName: 'Content Writer',
        severity: 'LOW',
        triggerContext: 'Blog post generation',
        flaggedOutput: 'Vertex was founded in 1995.',
        correctedOutput: 'Vertex was founded recently as an AI-native platform.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        status: 'Resolved'
      }
    ];

    res.status(200).json({ success: true, data: hallucinations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/monitoring/models/performance/agents
 * Returns a leaderboard of agents and their individual performance metrics.
 */
export const getAgentLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leaderboard = [
      {
        id: 'agent-1',
        name: 'Technical Support',
        model: 'GPT-4o',
        accuracy: 96.5,
        totalRequests: 14502,
        failureRate: 0.8,
        escalationRate: 2.1,
        qualityTrend: 'up'
      },
      {
        id: 'agent-2',
        name: 'Sales Development Rep',
        model: 'Claude 3.5 Sonnet',
        accuracy: 92.1,
        totalRequests: 8340,
        failureRate: 1.5,
        escalationRate: 5.4,
        qualityTrend: 'stable'
      },
      {
        id: 'agent-3',
        name: 'Onboarding Guide',
        model: 'GPT-4o-mini',
        accuracy: 89.4,
        totalRequests: 2105,
        failureRate: 3.2,
        escalationRate: 8.9,
        qualityTrend: 'down'
      },
      {
        id: 'agent-4',
        name: 'Content Writer',
        model: 'Claude 3 Opus',
        accuracy: 98.2,
        totalRequests: 1250,
        failureRate: 0.1,
        escalationRate: 0.5,
        qualityTrend: 'stable'
      }
    ];

    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};
