const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

// Protect all admin routes
router.use(auth);
router.use(checkRole([ROLES.ADMIN]));

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/agents', adminController.getAgents);
router.post('/agents/onboard', adminController.onboardAgent);
router.patch('/agents/:id/status', adminController.updateAgentStatus);
router.get('/vendors', adminController.getVendors);
router.post('/vendors/onboard', adminController.onboardVendor);
router.patch('/vendors/:id/status', adminController.updateVendorStatus);
router.get('/payin', adminController.getPayins);
router.get('/payout', adminController.getPayouts);
router.patch('/payout/:id/status', adminController.updatePayoutStatus);
router.get('/payouts', adminController.getPayouts);
router.patch('/payouts/:id/status', adminController.updatePayoutStatus);
router.get('/bookings', adminController.getBookings);
router.get('/reels', adminController.getReels);
router.patch('/reels/:id/status', adminController.updateReelStatus);
router.delete('/reels/:id', adminController.deleteReel);
router.get('/announcements', adminController.getAnnouncements);
router.patch('/announcements/:id/status', adminController.updateAnnouncementStatus);

// Service Review
router.get('/categories', adminController.getServiceCategories);
router.post('/categories', adminController.createServiceCategory);
router.patch('/categories/:id', adminController.updateServiceCategory);
router.delete('/categories/:id', adminController.deleteServiceCategory);
router.get('/services', adminController.getServices);
router.patch('/services/:id/status', adminController.updateServiceStatus);
router.delete('/services/:id', adminController.deleteService);

module.exports = router;
