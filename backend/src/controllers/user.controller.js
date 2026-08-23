const userService = require('../services/user.services');
const { ROLES } = require('../utils/constants');

const requireUserSession = (req) => {
    const userId = Number(req.user?.user_id);

    if ((req.user?.role_id !== ROLES.USER && req.user?.role_id !== ROLES.VENDOR) || !Number.isInteger(userId) || userId <= 0) {
        const error = new Error('Please log in with a user account to continue');
        error.statusCode = 401;
        throw error;
    }

    return userId;
};

exports.getProfile = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(requireUserSession(req));
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const updated = await userService.updateProfile(requireUserSession(req), req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

exports.updatePushToken = async (req, res, next) => {
    try {
        const userId = Number(req.user?.user_id);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        const { expo_push_token } = req.body;
        // In order to avoid circular dependencies or bloating userService, we can directly call repository here
        // or add it to userService. Let's add it to userService.
        const userRepository = require('../repositories/user.repository');
        await userRepository.updatePushToken(userId, expo_push_token);
        
        res.status(200).json({ success: true, message: 'Push token updated' });
    } catch (error) {
        next(error);
    }
};

// ─── Category & Service Browsing ────────────────────────────────────────────

/**
 * GET /api/users/categories
 * Returns all service categories.
 */
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await userService.getAllCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/categories/active
 * Returns only categories that have approved vendor services.
 */
exports.getActiveCategories = async (req, res, next) => {
    try {
        const categories = await userService.getActiveCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/services?category_id=1
 * Returns all approved vendor services, optionally filtered by category.
 */
exports.getServicesByCategory = async (req, res, next) => {
    try {
        const { category_id } = req.query;
        const services = await userService.getServicesByCategory(category_id);
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/services/search?q=plumber
 * Searches approved vendor services by keyword.
 */
exports.searchServices = async (req, res, next) => {
    try {
        const { q } = req.query;
        const services = await userService.searchServices(q);
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/services/:id
 * Get full details of a specific vendor service (with ratings & reviews).
 */
exports.getServiceDetails = async (req, res, next) => {
    try {
        const service = await userService.getServiceDetails(req.params.id);
        res.status(200).json({ success: true, data: service });
    } catch (error) {
        if (error.message === 'Service not found') {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        next(error);
    }
};

exports.getVendorServices = async (req, res, next) => {
    try {
        const services = await userService.getVendorServices(req.params.vendorId);
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

exports.getVendorProfile = async (req, res, next) => {
    try {
        const profile = await userService.getVendorProfilePublic(req.params.vendorId);
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        next(error);
    }
};

exports.getVendorAvailability = async (req, res, next) => {
    try {
        const availability = await userService.getVendorAvailability(req.params.vendorId, req.query.days);
        res.status(200).json({ success: true, data: availability });
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        next(error);
    }
};
