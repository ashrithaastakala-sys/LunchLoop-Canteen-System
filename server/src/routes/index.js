const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const menuRoutes = require('./menuRoutes');
const orderRoutes = require('./orderRoutes');
const staffRoutes = require('./staffRoutes');
const adminRoutes = require('./adminRoutes');

// Mount routes
router.use('/', publicRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
