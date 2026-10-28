const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireStaff } = require('../middleware/roleMiddleware');

const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const pickupWindowController = require('../controllers/pickupWindowController');
const analyticsController = require('../controllers/analyticsController');

// All staff endpoints require authentication and staff/admin role
router.use(authenticate, requireStaff);

// ----------------------------------------------------------------------------
// Staff Menu Management
// ----------------------------------------------------------------------------
router.get('/menu', (req, res, next) => menuController.getMenu(req, res, next));
router.post('/menu', (req, res, next) => menuController.createItem(req, res, next));
router.patch('/menu/:id', (req, res, next) => menuController.updateItem(req, res, next));
router.patch('/menu/:id/stock', (req, res, next) => menuController.updateStock(req, res, next));
router.patch('/menu/:id/availability', (req, res, next) => menuController.toggleAvailability(req, res, next));

// ----------------------------------------------------------------------------
// Kitchen Operations
// ----------------------------------------------------------------------------
router.get('/orders', (req, res, next) => orderController.getStaffOrders(req, res, next));
router.patch('/orders/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));
router.get('/queue', (req, res, next) => orderController.getKitchenQueue(req, res, next));

// ----------------------------------------------------------------------------
// Pickup-Window Management
// ----------------------------------------------------------------------------
router.get('/pickup-windows', (req, res, next) => pickupWindowController.getAllWindows(req, res, next));
router.post('/pickup-windows', (req, res, next) => pickupWindowController.createWindow(req, res, next));
router.patch('/pickup-windows/:id', (req, res, next) => pickupWindowController.updateWindow(req, res, next));

// ----------------------------------------------------------------------------
// Peak-Hour Analytics
// ----------------------------------------------------------------------------
router.get('/analytics/overview', (req, res, next) => analyticsController.getOverview(req, res, next));
router.get('/analytics/hourly-demand', (req, res, next) => analyticsController.getHourlyDemand(req, res, next));
router.get('/analytics/top-items', (req, res, next) => analyticsController.getTopItems(req, res, next));
router.get('/analytics/window-demand', (req, res, next) => analyticsController.getWindowDemand(req, res, next));
router.get('/analytics/cancellations', (req, res, next) => analyticsController.getOverview(req, res, next));
router.get('/analytics/inventory', (req, res, next) => analyticsController.getInventoryActivity(req, res, next));

module.exports = router;
