const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Public menu endpoints
router.get('/', (req, res, next) => menuController.getMenu(req, res, next));
router.get('/categories', (req, res, next) => menuController.getCategories(req, res, next));

module.exports = router;
