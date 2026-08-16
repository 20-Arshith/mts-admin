const userRepository = require('../repositories/user.repository');
const vendorServiceRepository = require('../repositories/vendor-service.repository');
const serviceCategoryRepository = require('../repositories/service-category.repository');
const vendorAvailabilityRepository = require('../repositories/vendor-availability.repository');
const bookingRepository = require('../repositories/booking.repository');
const vendorRepository = require('../repositories/vendor.repository');
const { buildDateSlots } = require('../utils/availability');
const logger = require('../utils/logger');
const { validateUserProfileInput } = require('../utils/validation');

const attachServiceInsights = (service) => {
    const reviews = (service.bookings || [])
        .map((booking) => booking.review)
        .filter(Boolean);

    const rating = reviews.length > 0
        ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
        : null;

    return {
        ...service,
        rating,
        review_count: reviews.length,
    };
};

exports.getProfile = async (userId) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        const error = new Error('Please log in with a user account to continue');
        error.statusCode = 401;
        throw error;
    }

    return await userRepository.getProfileInfo(userId);
};

exports.updateProfile = async (userId, data) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        const error = new Error('Please log in with a user account to continue');
        error.statusCode = 401;
        throw error;
    }

    const normalizedPayload = validateUserProfileInput(data, {
        requireRegistrationFields: Boolean(data?.registration_complete),
    });

    if (normalizedPayload.mobile) {
        const existingUser = await userRepository.findByMobile(normalizedPayload.mobile);
        if (existingUser && Number(existingUser.user_id) !== Number(userId)) {
            const error = new Error('Account already exists for this phone number');
            error.statusCode = 409;
            throw error;
        }
    }

    return await userRepository.updateProfileInfo(userId, normalizedPayload);
};

exports.registerUser = async (userData) => {
    const existingUser = await userRepository.findByMobile(userData.mobile);
    if (existingUser) {
        throw new Error('User already exists');
    }
    return await userRepository.create(userData);
};

// ─── Category & Service Browsing (User Module) ──────────────────────────────

/**
 * Get all service categories.
 * Returns all categories from the database.
 */
exports.getAllCategories = async () => {
    return await serviceCategoryRepository.findAll();
};

/**
 * Get only categories that have at least one approved vendor service.
 */
exports.getActiveCategories = async () => {
    return await vendorServiceRepository.findActiveCategories();
};

/**
 * Get all approved vendor services (from approved & available vendors).
 * Optionally filter by category_id.
 */
exports.getServicesByCategory = async (categoryId) => {
    const services = categoryId
        ? await vendorServiceRepository.findByCategory(parseInt(categoryId))
        : await vendorServiceRepository.findAllApproved();

    return services.map(attachServiceInsights);
};

/**
 * Search approved vendor services by keyword in title/description.
 */
exports.searchServices = async (keyword) => {
    const services = !keyword || keyword.trim().length === 0
        ? await vendorServiceRepository.findAllApproved()
        : await vendorServiceRepository.searchServices(keyword.trim());

    return services.map(attachServiceInsights);
};

/**
 * Get a single vendor service by ID with full details (including reviews).
 */
exports.getServiceDetails = async (serviceId) => {
    const service = await vendorServiceRepository.findServiceDetails(parseInt(serviceId));
    if (
        !service ||
        service.approval_status !== 'approved' ||
        service.is_available !== true ||
        service.vendor?.approval_status !== 'approved' ||
        service.vendor?.is_available !== true
    ) {
        throw new Error('Service not found');
    }

    // Calculate average rating from reviews
    const reviews = service.bookings
        ?.filter(b => b.review)
        .map(b => b.review) || [];

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return {
        ...service,
        rating: avgRating ? parseFloat(avgRating) : null,
        review_count: reviews.length,
        reviews: reviews.slice(0, 10) // return latest 10 reviews
    };
};

exports.getVendorServices = async (vendorId) => {
    const services = await vendorServiceRepository.findApprovedByVendor(parseInt(vendorId));
    return services.map(attachServiceInsights);
};

exports.getVendorProfilePublic = async (vendorId) => {
    const vendor = await vendorRepository.findVendorDetails(parseInt(vendorId));
    if (!vendor || vendor.approval_status !== 'approved' || !vendor.is_available) {
        throw new Error('Vendor not found');
    }
    
    // We can also calculate vendor level stats here (overall rating)
    let totalReviews = 0;
    let totalRatingSum = 0;
    
    if (vendor.services) {
        vendor.services.forEach(service => {
            if (service.bookings) {
                const reviews = service.bookings.map(b => b.review).filter(Boolean);
                totalReviews += reviews.length;
                totalRatingSum += reviews.reduce((sum, r) => sum + r.rating, 0);
            }
        });
    }

    return {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        description: vendor.description,
        address: vendor.address,
        logo_url: vendor.logo_url,
        banner_url: vendor.banner_url,
        mobile: vendor.mobile || vendor.user?.mobile,
        whatsapp_number: vendor.whatsapp_number,
        rating: totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : null,
        review_count: totalReviews,
        gallery: vendor.gallery || [],
        reels: (vendor.reels || []).filter(
            (reel) => reel.approval_status === 'approved' && reel.status === 'approved'
        )
    };
};

exports.getVendorAvailability = async (vendorId, days = 7) => {
    const normalizedVendorId = parseInt(vendorId, 10);
    const vendor = await vendorRepository.findById(normalizedVendorId, 'vendor_id');
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    const schedule = await vendorAvailabilityRepository.findByVendor(normalizedVendorId);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(days || 7));

    const bookings = await bookingRepository.findVendorBookingsInRange(normalizedVendorId, start, end);
    return {
        vendor_id: normalizedVendorId,
        is_available: Boolean(vendor.is_available && vendor.approval_status === 'approved'),
        dates: buildDateSlots({
            schedule,
            bookings,
            days: Number(days || 7),
            vendorAvailable: Boolean(vendor.is_available && vendor.approval_status === 'approved'),
        }),
    };
};
