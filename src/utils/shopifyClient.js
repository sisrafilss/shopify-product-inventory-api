import axios from 'axios';
import config from '../config/index.js';
import { getAccessToken } from './tokenManager.js';

const { shopDomain, apiVersion } = config.shopify;

const shopifyClient = axios.create({
  baseURL: `${shopDomain}/admin/api/${apiVersion}/graphql.json`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Inject the latest access token before every request so that the token
// refreshed by the cron job is always used — no server restart required.
shopifyClient.interceptors.request.use((requestConfig) => {
  requestConfig.headers['X-Shopify-Access-Token'] = getAccessToken();
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