const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../utils/constants');

router.get('/active', announcementController.getActive);
router.get('/my', auth, checkRole([ROLES.VENDOR]), announcementController.getMyAnnouncements);
router.post('/', auth, checkRole([ROLES.VENDOR]), announcementController.createMyAnnouncement);
router.patch('/:id', auth, checkRole([ROLES.VENDOR]), announcementController.updateMyAnnouncement);
router.delete('/:id', auth, checkRole([ROLES.VENDOR]), announcementController.deleteMyAnnouncement);

module.exports = router;
