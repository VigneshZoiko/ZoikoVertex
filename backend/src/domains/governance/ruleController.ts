import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * Mock data for Approval Rules. In a production system, these would be stored in the database.
 */
const DEFAULT_RULES = [
  {
    id: 'r1',
    name: 'EU High-Risk Financial Protocol',
    dimensions: { region: 'EU', risk: 'HIGH', type: 'Financial' },
    path: ['MANAGER', 'COMPLIANCE', 'LEGAL', 'ADMIN'],
    status: 'active',
    hits: 1242,
    latency: '1.4h'
  },
  {
    id: 'r2',
    name: 'Global Instagram Creative Flow',
    dimensions: { platform: 'Instagram', brand: 'Main' },
    path: ['CREATIVE_DIR', 'MANAGER'],
    status: 'active',
    hits: 8560,
    latency: '0.8h'
  },
  {
    id: 'r3',
    name: 'Standard Twitter Operations',
    dimensions: { platform: 'X (Twitter)', risk: 'LOW' },
    path: ['MANAGER'],
    status: 'active',
    hits: 15201,
    latency: '0.2h'
  },
  {
    id: 'r4',
    name: 'APAC Market Entry Campaign',
    dimensions: { region: 'APAC', market: 'Emerging' },
    path: ['REGION_HEAD', 'MANAGER', 'ADMIN'],
    status: 'active',
    hits: 412,
    latency: '2.5h'
  }
];

export const listRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // In the future, we can filter by workspace_id if we move rules to the database
    res.status(200).json({ success: true, data: DEFAULT_RULES });
  } catch (error) {
    next(error);
  }
};

export const createRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, dimensions, path } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Mock response for now
    const newRule = {
      id: `r${Math.floor(Math.random() * 1000)}`,
      name,
      dimensions,
      path,
      status: 'active',
      hits: 0,
      latency: '0h'
    };

    res.status(201).json({ success: true, data: newRule });
  } catch (error) {
    next(error);
  }
};
