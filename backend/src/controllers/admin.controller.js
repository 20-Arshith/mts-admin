const adminService = require('../services/admin.services');
const { validateAgentOnboardingInput } = require('../utils/validation');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await adminService.getStats();
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

exports.getAgents = async (req, res, next) => {
    try {
        const agents = await adminService.getAllAgents();
        res.status(200).json({ success: true, data: agents });
    } catch (error) {
        next(error);
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const users = await adminService.getAllUsers();
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

exports.updateAgentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const agent = await adminService.updateAgentStatus(id, status);
        res.status(200).json({ success: true, message: `Agent status updated to ${status}`, data: agent });
    } catch (error) {
        next(error);
    }
};

exports.getVendors = async (req, res, next) => {
    try {
        const vendors = await adminService.getAllVendors();
        res.status(200).json({ success: true, data: vendors });
    } catch (error) {
        next(error);
    }
};

exports.onboardVendor = async (req, res, next) => {
    try {
        const vendor = await adminService.onboardVendor(req.body || {});
        res.status(201).json({
            success: true,
            message: 'Vendor onboarded successfully',
            data: vendor,
        });
    } catch (error) {
        if (
            error.message === 'Selected service category does not exist' ||
            error.message === 'Mobile number or email is required' ||
            error.message === 'Full name is required' ||
            error.message === 'Business name is required'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.updateVendorStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const vendor = await adminService.updateVendorStatus(id, status);
        res.status(200).json({ success: true, message: `Vendor status updated to ${status}`, data: vendor });
    } catch (error) {
        next(error);
    }
};

exports.getPayouts = async (req, res, next) => {
    try {
        const payouts = await adminService.getAllPayoutRequests();
        res.status(200).json({ success: true, data: payouts });
    } catch (error) {
        next(error);
    }
};

exports.getPayins = async (req, res, next) => {
    try {
        const payins = await adminService.getAllPayins();
        res.status(200).json({ success: true, data: payins });
    } catch (error) {
        next(error);
    }
};

exports.updatePayoutStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, proof_image_url } = req.body;
        const payout = await adminService.updatePayoutStatus(id, status, proof_image_url);
        res.status(200).json({ success: true, message: `Payout status updated to ${payout.status}`, data: payout });
    } catch (error) {
        if (
            error.message === 'Invalid payout status' ||
            error.message === 'Payout proof image is required'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.getBookings = async (req, res, next) => {
    try {
        const bookings = await adminService.getAllBookings();
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
};

exports.getReels = async (req, res, next) => {
    try {
        const reels = await adminService.getAllReels(req.query);
        res.status(200).json({ success: true, data: reels.items, meta: reels.meta });
    } catch (error) {
        next(error);
    }
};

exports.updateReelStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const reel = await adminService.updateReelStatus(id, status);
        res.status(200).json({ success: true, message: `Reel status updated to ${reel.status}`, data: reel });
    } catch (error) {
        if (error.message === 'Invalid reel status') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.deleteReel = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminService.deleteReel(id);
        res.status(200).json({ success: true, message: 'Reel deleted by admin' });
    } catch (error) {
        next(error);
    }
};

exports.getAnnouncements = async (req, res, next) => {
    try {
        const announcements = await adminService.getAllAnnouncements(req.query);
        res.status(200).json({ success: true, data: announcements.items, meta: announcements.meta });
    } catch (error) {
        next(error);
    }
};

exports.updateAnnouncementStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const announcement = await adminService.updateAnnouncementStatus(id, status);
        res.status(200).json({
            success: true,
            message: `Broadcast status updated to ${announcement.status}`,
            data: announcement,
        });
    } catch (error) {
        if (error.message === 'Invalid announcement status') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.getServices = async (req, res, next) => {
    try {
        const services = await adminService.getAllServices();
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

exports.getServiceCategories = async (req, res, next) => {
    try {
        const categories = await adminService.getAllServiceCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

exports.createServiceCategory = async (req, res, next) => {
    try {
        const category = await adminService.createServiceCategory(req.body?.category_name, req.body?.icon_name);
        res.status(201).json({
            success: true,
            message: 'Service category added successfully',
            data: category,
        });
    } catch (error) {
        if (
            error.message === 'Category name is required' ||
            error.message === 'A service category with this name already exists'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.updateServiceCategory = async (req, res, next) => {
    try {
        const category = await adminService.updateServiceCategory(
            req.params.id,
            req.body?.category_name,
            req.body?.icon_name,
        );
        res.status(200).json({
            success: true,
            message: 'Service category updated successfully',
            data: category,
        });
    } catch (error) {
        if (
            error.message === 'Category name is required' ||
            error.message === 'A service category with this name already exists' ||
            error.message === 'Service category not found'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.deleteServiceCategory = async (req, res, next) => {
    try {
        await adminService.deleteServiceCategory(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Service category deleted successfully',
        });
    } catch (error) {
        if (
            error.message === 'Service category not found' ||
            error.message === 'This category is already linked to vendors or services and cannot be deleted'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.updateServiceStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const service = await adminService.updateServiceStatus(id, status);
        res.status(200).json({ success: true, message: `Service status updated to ${service.status}`, data: service });
    } catch (error) {
        if (error.message === 'Invalid service status') {
            return res.status(400).json({ success: false, message: error.message });
        }

        next(error);
    }
};

exports.deleteService = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminService.deleteService(id);
        res.status(200).json({ success: true, message: 'Service deleted by admin' });
    } catch (error) {
        next(error);
    }
};

exports.onboardAgent = async (req, res, next) => {
    try {
        const agentInput = validateAgentOnboardingInput(req.body || {});
        const agent = await adminService.onboardAgent(agentInput);
        res.status(201).json({
            success: true,
            message: `Agent onboarded successfully. Referral code: ${agent.referral_code}`,
            data: {
                agent_id: agent.agent_id,
                name: agent.name,
                full_name: agent.name,
                mobile: agent.mobile,
                email: agent.email,
                referral_code: agent.referral_code,
                approval_status: agent.approval_status
            }
        });
    } catch (error) {
        if (
            error.message === 'An agent with this phone number already exists' ||
            error.message === 'An agent with this email already exists'
        ) {
            return res.status(409).json({ success: false, message: error.message });
        }
        next(error);
    }
};
