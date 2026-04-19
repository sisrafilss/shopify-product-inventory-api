import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import config from './src/config/index.js';
import startTokenRefreshJob from './src/jobs/tokenRefreshJob.js';

const { port } = config;

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${config.env} mode`);

  // Start the token refresh cron job (fires immediately + every 23 hours).
  startTokenRefreshJob();
});