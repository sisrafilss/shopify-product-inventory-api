import cron from 'node-cron';
import { fetchAndStoreToken } from '../utils/tokenManager.js';

/**
 * Starts the Shopify access-token refresh cron job.
 *
 * Schedule: every 23 hours — cron expression: "0 * /23 * * *" (space added to avoid closing this comment)
 * This keeps the token fresh well within Shopify's 24-hour expiry window.
 *
 * The function also triggers an immediate token fetch on startup so the server
 * never relies solely on the static .env value once it's running.
 */
const startTokenRefreshJob = async () => {
  // Fetch a fresh token right away when the server boots.
  try {
    await fetchAndStoreToken();
  } catch (err) {
    console.error(
      '[tokenRefreshJob] Initial token fetch failed — falling back to .env token.\n',
      err.message
    );
  }

  // Schedule subsequent refreshes every 23 hours.
  // Cron syntax: minute  hour  day-of-month  month  day-of-week
  //              0       */23  *             *      *
  cron.schedule('0 */23 * * *', async () => {
    try {
      await fetchAndStoreToken();
    } catch (err) {
      console.error(
        '[tokenRefreshJob] Scheduled token refresh failed — current token unchanged.\n',
        err.message
      );
    }
  });

  console.log('[tokenRefreshJob] Token refresh job scheduled (every 23 hours).');
};

export default startTokenRefreshJob;
