import crypto from 'crypto';
import axios from 'axios';
import redis from './redisClient.js';
import config from '../config/index.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Redis key where the encrypted token payload is stored. */
const REDIS_KEY = 'shopify:access_token_data';

/** Treat the token as stale after 23 hours (Shopify invalidates at 24h). */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

/** AES-256-CBC — 256-bit key, 128-bit block, authenticated via IV. */
const ALGORITHM = 'aes-256-cbc';

// ─── Encryption helpers ───────────────────────────────────────────────────────

/**
 * Derives a fixed 32-byte AES key from TOKEN_ENCRYPTION_KEY using scrypt.
 * scrypt is memory-hard so brute-forcing the key from a stolen Redis dump
 * is computationally expensive even if the salt is known.
 */
const getEncryptionKey = () => {
  const secret = config.tokenEncryptionKey;
  if (!secret) {
    throw new Error('[tokenManager] TOKEN_ENCRYPTION_KEY is missing in .env');
  }
  // Salt is fixed and non-secret — its only job is domain-separation.
  return crypto.scryptSync(secret, 'shopify-token-salt-v1', 32);
};

/**
 * Encrypts a plaintext string with AES-256-CBC.
 * A fresh random IV is generated for every encryption so identical tokens
 * produce different ciphertexts (semantic security).
 *
 * @param {string} text  - Plaintext to encrypt.
 * @returns {{ iv: string, encrypted: string }} Hex-encoded IV and ciphertext.
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
  };
};

/**
 * Decrypts an AES-256-CBC ciphertext back to plaintext.
 *
 * @param {string} encryptedHex - Hex-encoded ciphertext.
 * @param {string} ivHex        - Hex-encoded IV used during encryption.
 * @returns {string} Decrypted plaintext.
 */
const decrypt = (encryptedHex, ivHex) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a guaranteed-fresh Shopify access token.
 *
 * Logic (runs on every incoming API request via the axios interceptor):
 *
 *  1. Read the encrypted payload from Redis.
 *  2. If a payload exists AND it is younger than 23 hours → decrypt and return
 *     the cached token. Zero network calls to Shopify.
 *  3. If the payload is missing (first ever deploy) OR older than 23 hours →
 *     fetch a brand-new token from Shopify, encrypt it, write it to Redis,
 *     then return it.
 *
 * This pattern is safe on Vercel (serverless) because state lives in Redis,
 * not in the Node.js process memory that evaporates on every cold start.
 *
 * @returns {Promise<string>} A valid Shopify access token.
 */
export const getValidToken = async () => {
  // ── Step 1: try the Redis cache ──────────────────────────────────────────
  const raw = await redis.get(REDIS_KEY);

  if (raw) {
    const { encrypted, iv, issuedAt } = JSON.parse(raw);
    const ageMs = Date.now() - issuedAt;

    if (ageMs < TOKEN_TTL_MS) {
      // ── Step 2: token is still fresh — return it without hitting Shopify ──
      console.log(
        `[tokenManager] Using cached token (age: ${Math.floor(ageMs / 60000)} min).`
      );
      return decrypt(encrypted, iv);
    }

    console.log(
      `[tokenManager] Cached token is ${Math.floor(ageMs / 3600000)}h old — refreshing.`
    );
  } else {
    console.log('[tokenManager] No token found in Redis — fetching for the first time.');
  }

  // ── Step 3: token is stale or missing → fetch and store a fresh one ──────
  return fetchAndStoreToken();
};

/**
 * Fetches a new Shopify access token using the client_credentials grant,
 * encrypts it, and persists it in Redis with the current timestamp.
 *
 * @returns {Promise<string>} The newly obtained plaintext access token.
 */
export const fetchAndStoreToken = async () => {
  const { storeName, clientId, clientSecret } = config.shopify;

  if (!clientId || !clientSecret) {
    throw new Error('[tokenManager] CLIENT_ID or CLIENT_SECRET is missing in .env');
  }

  const url = `https://${storeName}.myshopify.com/admin/oauth/access_token`;
  console.log(`[tokenManager] Requesting new token from Shopify (store: ${storeName}).`);

  const response = await axios.post(
    url,
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const newToken = response.data?.access_token;
  if (!newToken) {
    throw new Error('[tokenManager] Shopify did not return an access_token in the response.');
  }

  // Encrypt and persist to Redis.
  const { encrypted, iv } = encrypt(newToken);
  const payload = JSON.stringify({
    encrypted,
    iv,
    issuedAt: Date.now(), // Unix ms — used to calculate token age on next read
  });

  await redis.set(REDIS_KEY, payload);
  console.log('[tokenManager] New token encrypted and stored in Redis successfully.');

  return newToken;
};
