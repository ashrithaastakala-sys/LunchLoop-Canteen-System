const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// All student order endpoints require authentication
router.use(authenticate);

// Order creation rate-limited to avoid abuse & duplicate submissions
router.post('/', rateLimiter({ max: 30, windowMs: 60000 }), (req, res, next) => orderController.createOrder(req, res, next));

// Student order history & tracking
router.get('/', (req, res, next) => orderController.getMyOrders(req, res, next));
router.get('/:id', (req, res, next) => orderController.getOrderById(req, res, next));
router.post('/:id/cancel', (req, res, next) => orderController.cancelOrder(req, res, next));

module.exports = router;
