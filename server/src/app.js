const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./errors/AppError');
const config = require('./config/env');

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: true, // Allow configured origins in development/production
  credentials: true,
}));

// Request payload size limiting
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Serve frontend static assets from /public
const publicPath = path.resolve(__dirname, '../../public');
app.use(express.static(publicPath));

// Mount REST API
app.use('/api', apiRoutes);

// Catch 404 for unmatched API routes
app.all('/api/*', (req, res, next) => {
  next(AppError.notFound(`Endpoint ${req.method} ${req.originalUrl} does not exist.`));
});

// For any non-API GET request that doesn't match a static file, serve index.html (SPA/fallback)
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  }
  next();
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
