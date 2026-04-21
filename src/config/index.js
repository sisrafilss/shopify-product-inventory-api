import dotenv from 'dotenv';
dotenv.config();

// Derive the store name from the full domain (e.g. "shop-blank-apparel" from
// "https://shop-blank-apparel.myshopify.com") so the token-refresh endpoint
// can be built dynamically without hard-coding the store URL.
const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || '';
const storeName = shopDomain.replace(/^https?:\/\//, '').split('.')[0];

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  shopify: {
    shopDomain,
    storeName,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.GRAPHQL_API_VERSION || '2025-01',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  },
  redisUrl: process.env.REDIS_URL,
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};