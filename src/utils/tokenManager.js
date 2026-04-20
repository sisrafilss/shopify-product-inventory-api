import axios from 'axios';
import config from '../config/index.js';

/**
 * In-memory token store.
 *
 * ⚠️  SERVERLESS COMPATIBILITY NOTE (Vercel / AWS Lambda / etc.)
 * -----------------------------------------------------------------
 * On serverless platforms there is NO persistent Node.js process, so:
 *   - node-cron jobs NEVER run between requests.
 *   - In-memory state is wiped after every cold start.
 *   - The token seeded from .env expires after 24 h and is never refreshed.
 *
 * Solution → Lazy-refresh pattern:
 *   `getValidToken()` is called before every Shopify API request.
 *   It checks how old the current token is and re-fetches automatically
 *   if it is stale (≥ TOKEN_TTL_MS), so the server is always authenticated
 *   without manual redeployment.
 */

/** How long (ms) we consider a token valid — 23 hours to stay inside Shopify's 24-hour window. */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours

let _currentToken = config.shopify.accessToken; // seed from .env on cold start
let _tokenFetchedAt = null;                     // null → we don't know when the .env token was issued

/**
 * Returns the currently stored access token synchronously.
 * Prefer `getValidToken()` in production code — this is kept for
 * backwards-compatibility and simple read-only inspection.
 *
 * @returns {string} The current Shopify access token.
 */
export const getAccessToken = () => _currentToken;

/**
 * Returns a guaranteed-fresh access token.
 *
 * - If the token has never been fetched via OAuth (i.e. we're still on the
 *   .env seed value) OR it is older than TOKEN_TTL_MS, a new token is
 *   fetched from Shopify before returning.
 * - Otherwise the cached token is returned immediately (no network call).
 *
 * This is the correct entry-point for all Shopify API callers because it
 * works correctly on serverless platforms where cron jobs never execute.
 *
 * @returns {Promise<string>} A valid Shopify access token.
 */
export const getValidToken = async () => {
  const isStale =
    _tokenFetchedAt === null ||                         // never refreshed via OAuth
    Date.now() - _tokenFetchedAt >= TOKEN_TTL_MS;      // older than 23 hours

  if (isStale) {
    console.log('[tokenManager] Token is stale or uninitialized — fetching a new one.');
    await fetchAndStoreToken();
  }

  return _currentToken;
};

/**
 * Fetches a brand-new access token from Shopify using the client_credentials
 * grant type and stores it in memory.
 *
 * Called by `getValidToken()` on demand (lazy refresh) AND by the cron job
 * on long-running server deployments (e.g. local dev, Railway, Render).
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
  _tokenFetchedAt = Date.now(); // ← record when we got this token
  console.log('[tokenManager] Access token refreshed and timestamp recorded.');

  return _currentToken;
};
