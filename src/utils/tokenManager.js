import axios from 'axios';
import config from '../config/index.js';

/**
 * In-memory token store.
 *
 * Why in-memory?
 * - No database is available in this project.
 * - The token is regenerated every 23 hours (well within Shopify's 24-hour
 *   expiry window), so persistence across restarts is NOT required.
 * - On every cold start, fetchAndStoreToken() is called immediately, so the
 *   server always boots with a fresh token.
 * - The .env value acts as a safe fallback during the very first boot tick.
 */
let _currentToken = config.shopify.accessToken; // seed from .env on startup

/**
 * Returns the currently stored access token.
 * Always use this getter in other modules — never cache the token yourself.
 *
 * @returns {string} The current Shopify access token.
 */
export const getAccessToken = () => _currentToken;

/**
 * Fetches a brand-new access token from Shopify using the client_credentials
 * grant type and stores it in memory.
 *
 * Called once at server startup and then every 23 hours by the cron job.
 *
 * @returns {Promise<string>} The newly obtained access token.
 */
export const fetchAndStoreToken = async () => {
  const { storeName, clientId, clientSecret } = config.shopify;

  if (!clientId || !clientSecret) {
    throw new Error(
      '[tokenManager] CLIENT_ID or CLIENT_SECRET is missing in .env'
    );
  }

  const url = `https://${storeName}.myshopify.com/admin/oauth/access_token`;

  console.log(`[tokenManager] Refreshing Shopify access token for store: ${storeName}`);

  const response = await axios.post(
    url,
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  const newToken = response.data?.access_token;

  if (!newToken) {
    throw new Error(
      '[tokenManager] Shopify did not return an access_token in the response'
    );
  }

  _currentToken = newToken;
  console.log('[tokenManager] Access token refreshed successfully.');
  console.log("New access token", newToken);

  return _currentToken;
};
