
import { logger } from '../../shared/logger';

export class AutoCampaignBoostService {
  static async processActiveCampaignPosts(_campaignId: string, _workspaceId: string): Promise<void> {
    logger.info({ _campaignId }, '[AutoBoost] processActiveCampaignPosts stub — no-op');
  }

  static async triggerPostBoost(_intentId: string, _campaignId: string, _workspaceId: string): Promise<void> {
    logger.info({ _intentId }, '[AutoBoost] triggerPostBoost stub — no-op');
  }
}
