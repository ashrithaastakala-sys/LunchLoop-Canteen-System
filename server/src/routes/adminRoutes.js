const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

router.use(authenticate, requireAdmin);

router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.patch('/users/:id/role', (req, res, next) => adminController.updateUserRole(req, res, next));
router.get('/settings', (req, res, next) => adminController.getSettings(req, res, next));
router.patch('/settings', (req, res, next) => adminController.updateSettings(req, res, next));

module.exports = router;
