import axios from 'axios';
import config from '../config/index.js';
import { getValidToken } from './tokenManager.js';

const { shopDomain, apiVersion } = config.shopify;

const shopifyClient = axios.create({
  baseURL: `${shopDomain}/admin/api/${apiVersion}/graphql.json`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Inject a guaranteed-fresh access token before every request.
// The interceptor is async so it can lazily refresh the token when stale —
// this is the key fix for serverless environments (Vercel) where node-cron
// never runs and in-memory state resets on every cold start.
shopifyClient.interceptors.request.use(async (requestConfig) => {
  requestConfig.headers['X-Shopify-Access-Token'] = await getValidToken();
  return requestConfig;
});

export const fetchProductInventory = async (productId) => {
  const query = `
    query GetProductInventory($productId: ID!) {
      product(id: $productId) {
        title
        variants(first: 250) {
          edges {
            node {
              id
              title
              price
              inventoryQuantity
              selectedOptions {
                name
                value
              }
              inventoryItem {
                tracked
                inventoryLevels(first: 250) {
                  edges {
                    node {
                      quantities(names: ["available",]) {
                        name
                        quantity
                        
                      }
                      location {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;


  const response = await shopifyClient.post('', { query, variables: { productId } });
  return response.data;
};

export default shopifyClient;