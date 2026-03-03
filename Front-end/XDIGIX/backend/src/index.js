require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const config = require('./config/env');

connectDB()
  .then(() => {
    const server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT} (${config.NODE_ENV})`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${config.PORT} is already in use. Kill the process using it or set PORT to another value in .env (e.g. PORT=5001).`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
