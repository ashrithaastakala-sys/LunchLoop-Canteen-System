const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const pickupWindowController = require('../controllers/pickupWindowController');
const { authenticate } = require('../middleware/authMiddleware');
const { sendSuccess } = require('../utils/response');
const config = require('../config/env');

// Health Check
router.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    service: 'LunchLoop API Server',
    uptime_seconds: Math.floor(process.uptime()),
    supabase_configured: config.isSupabaseConfigured(),
    timezone: config.campusTimezone,
  });
});

// Public Canteen & Campus Information
router.get('/public/canteen', (req, res, next) => authController.getPublicCanteenInfo(req, res, next));

// Authentication Endpoints (Supabase Auth)
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));
router.post('/auth/register', (req, res, next) => authController.register(req, res, next));
router.post('/auth/demo-login', (req, res, next) => authController.demoLogin(req, res, next));

// Public Active Pickup Windows
router.get('/pickup-windows', (req, res, next) => pickupWindowController.getAvailableWindows(req, res, next));

// User Profile Endpoints
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.patch('/me', authenticate, (req, res, next) => authController.updateMe(req, res, next));

module.exports = router;
