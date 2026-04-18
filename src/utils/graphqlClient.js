import axios from 'axios';

export const graphqlClient = (baseURL) => {
  return axios.create({
    baseURL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const sendGraphQLRequest = async (client, query, variables = {}) => {
  const response = await client.post('', { query, variables });
  return response.data;
};