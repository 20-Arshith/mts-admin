const announcementService = require('../services/announcement.services');

exports.getActive = async (req, res, next) => {
    try {
        const announcements = await announcementService.getActiveAnnouncements(req.query.location);
        res.status(200).json({ success: true, data: announcements });
    } catch (error) {
        next(error);
    }
};

exports.getMyAnnouncements = async (req, res, next) => {
    try {
        const announcements = await announcementService.getVendorAnnouncements(req.user.user_id);
        res.status(200).json({ success: true, data: announcements });
    } catch (error) {
        next(error);
    }
};

exports.createMyAnnouncement = async (req, res, next) => {
    try {
        const announcement = await announcementService.createVendorAnnouncement(req.user.user_id, req.body);
        res.status(201).json({ success: true, data: announcement });
    } catch (error) {
        next(error);
    }
};

exports.updateMyAnnouncement = async (req, res, next) => {
    try {
        const announcement = await announcementService.updateVendorAnnouncement(
            req.params.id,
            req.user.user_id,
            req.body
        );
        res.status(200).json({ success: true, data: announcement });
    } catch (error) {
        next(error);
    }
};

exports.deleteMyAnnouncement = async (req, res, next) => {
    try {
        await announcementService.deleteVendorAnnouncement(req.params.id, req.user.user_id);
        res.status(200).json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        next(error);
    }
};
