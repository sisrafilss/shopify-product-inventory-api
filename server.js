import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import config from './src/config/index.js';

const { port } = config;

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${config.env} mode`);
});