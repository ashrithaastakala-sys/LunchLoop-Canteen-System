const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, () => {
  console.log('=====================================================');
  console.log(` LunchLoop Canteen System running at http://localhost:${config.port}`);
  console.log(` Environment: ${config.env}`);
  console.log(` Campus Timezone: ${config.campusTimezone}`);
  console.log(` Supabase Configured: ${config.isSupabaseConfigured() ? 'YES' : 'NO (See setup docs)'}`);
  console.log('=====================================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = server;
