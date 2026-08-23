const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reel.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { uploadVideo } = require('../middlewares/upload.middleware');
const { ROLES } = require('../utils/constants');

// Public route to view reels
router.get('/', reelController.getReels);
router.post('/:id/view', reelController.recordView);
router.get('/:id/stats', reelController.getReelStats);

// Vendor only routes for managing reels
router.post('/', auth, checkRole([ROLES.VENDOR]), uploadVideo, reelController.uploadReel);
router.get('/my', auth, checkRole([ROLES.VENDOR]), reelController.getMyReels);
router.delete('/:id', auth, checkRole([ROLES.VENDOR]), reelController.removeReel);

module.exports = router;
