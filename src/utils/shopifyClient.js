import axios from 'axios';
import config from '../config/index.js';

const { shopDomain, accessToken, apiVersion } = config.shopify;

const shopifyClient = axios.create({
  baseURL: `${shopDomain}/admin/api/${apiVersion}/graphql.json`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken
  }
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