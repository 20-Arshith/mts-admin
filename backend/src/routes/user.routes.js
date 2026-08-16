const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');

// ─── Public Routes (no auth needed — browsing) ─────────────────────────────

// Categories
router.get('/categories', userController.getCategories);
router.get('/categories/active', userController.getActiveCategories);

// Services (browse / search by category)
router.get('/services/search', userController.searchServices);
router.get('/vendors/:vendorId/profile', userController.getVendorProfile);
router.get('/vendors/:vendorId/services', userController.getVendorServices);
router.get('/vendors/:vendorId/availability', userController.getVendorAvailability);
router.get('/services/:id', userController.getServiceDetails);
router.get('/services', userController.getServicesByCategory);

// ─── Authenticated Routes ───────────────────────────────────────────────────

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.patch('/push-token', auth, userController.updatePushToken);

module.exports = router;
