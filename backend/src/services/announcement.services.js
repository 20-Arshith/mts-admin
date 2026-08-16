const announcementRepository = require('../repositories/announcement.repository');

const DEFAULT_EXPIRY_HOURS = 24;

const normalizeAnnouncementInput = (data = {}, partial = false) => {
    const payload = {};

    if (!partial || data.message !== undefined) {
        const message = String(data.message || '').trim();
        if (!message) {
            const error = new Error('Announcement message is required');
            error.statusCode = 400;
            throw error;
        }
        payload.message = message;
    }

    if (!partial || data.location_identifier !== undefined) {
        const locationIdentifier = String(data.location_identifier || '').trim();
        if (!locationIdentifier) {
            const error = new Error('Announcement location is required');
            error.statusCode = 400;
            throw error;
        }
        payload.location_identifier = locationIdentifier;
    }

    if (data.image_url !== undefined) {
        const imageUrl = String(data.image_url || '').trim();
        payload.image_url = imageUrl || null;
    }

    if (data.is_active !== undefined) {
        payload.is_active = Boolean(data.is_active);
    }

    if (data.start_at !== undefined) {
        payload.start_at = data.start_at ? new Date(data.start_at) : new Date();
        if (Number.isNaN(payload.start_at.getTime())) {
            const error = new Error('Invalid start date');
            error.statusCode = 400;
            throw error;
        }
    }

    if (data.expires_at !== undefined) {
        payload.expires_at = data.expires_at ? new Date(data.expires_at) : null;
        if (payload.expires_at && Number.isNaN(payload.expires_at.getTime())) {
            const error = new Error('Invalid end date');
            error.statusCode = 400;
            throw error;
        }
    }

    if (payload.start_at && payload.expires_at && payload.expires_at <= payload.start_at) {
        const error = new Error('End date must be after start date');
        error.statusCode = 400;
        throw error;
    }

    return payload;
};

exports.getActiveAnnouncements = async (locationIdentifier) => {
    return await announcementRepository.findActiveByLocation(locationIdentifier);
};

exports.getVendorAnnouncements = async (vendorId) => {
    return await announcementRepository.findByVendor(vendorId);
};

exports.createVendorAnnouncement = async (vendorId, data) => {
    const payload = normalizeAnnouncementInput(data);
    const startAt = payload.start_at || new Date();

    return await announcementRepository.create({
        ...payload,
        vendor_id: vendorId,
        approval_status: 'pending',
        status: 'pending',
        start_at: startAt,
        expires_at: payload.expires_at || new Date(startAt.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000),
    });
};

exports.updateVendorAnnouncement = async (announcementId, vendorId, data) => {
    const parsedAnnouncementId = parseInt(announcementId, 10);
    if (!Number.isInteger(parsedAnnouncementId) || parsedAnnouncementId <= 0) {
        const error = new Error('Invalid announcement id');
        error.statusCode = 400;
        throw error;
    }

    const existing = await announcementRepository.findVendorAnnouncement(parsedAnnouncementId, vendorId);
    if (!existing) {
        const error = new Error('Announcement not found');
        error.statusCode = 404;
        throw error;
    }

    const payload = {
        ...normalizeAnnouncementInput(data, true),
        approval_status: 'pending',
        status: 'pending',
    };
    return await announcementRepository.update(parsedAnnouncementId, payload, 'announcement_id');
};

exports.deleteVendorAnnouncement = async (announcementId, vendorId) => {
    const parsedAnnouncementId = parseInt(announcementId, 10);
    if (!Number.isInteger(parsedAnnouncementId) || parsedAnnouncementId <= 0) {
        const error = new Error('Invalid announcement id');
        error.statusCode = 400;
        throw error;
    }

    const existing = await announcementRepository.findVendorAnnouncement(parsedAnnouncementId, vendorId);
    if (!existing) {
        const error = new Error('Announcement not found');
        error.statusCode = 404;
        throw error;
    }

    return await announcementRepository.delete(parsedAnnouncementId, 'announcement_id');
};
