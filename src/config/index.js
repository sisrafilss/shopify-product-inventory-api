import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  shopify: {
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.GRAPHQL_API_VERSION || '2025-01'
  },
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};