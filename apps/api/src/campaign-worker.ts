// Standalone entrypoint — runs CampaignWorker as a separate process.
// In Docker: CMD ["node", "dist/campaign-worker.js"]
import './load-env';
import { campaignWorker } from './jobs/campaign-worker.job';
import { logger } from './lib/logger';

campaignWorker.start().catch((err) => {
  logger.error(`[CampaignWorker] Fatal: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => campaignWorker.stop());
process.on('SIGINT', () => campaignWorker.stop());
