const vendorRepository = require('../repositories/vendor.repository');
const serviceCategoryRepository = require('../repositories/service-category.repository');
const vendorServiceRepository = require('../repositories/vendor-service.repository');
const vendorAvailabilityRepository = require('../repositories/vendor-availability.repository');
const reviewRepository = require('../repositories/review.repository');
const { mergeScheduleWithDefaults, validateScheduleInput } = require('../utils/availability');
const logger = require('../utils/logger');
const { createValidationError, validateVendorServicePayload } = require('../utils/validation');
const authService = require('./auth.services');

async function syncVendorPrimaryCategory(vendorId) {
    const services = await vendorServiceRepository.findByVendor(vendorId);
    const orderedServices = [...services].sort((left, right) => {
        if (left.approval_status === right.approval_status) {
            return (right.id || 0) - (left.id || 0);
        }

        if (left.approval_status === 'approved') {
            return -1;
        }

        if (right.approval_status === 'approved') {
            return 1;
        }

        return (right.id || 0) - (left.id || 0);
    });

    const categoryIds = [...new Set(orderedServices.map((service) => service.category_id).filter(Boolean))];

    await vendorRepository.update(vendorId, {
        category_id: categoryIds.length > 0 ? categoryIds[0] : null
    }, 'vendor_id');
}

async function attachVendorInsights(vendor) {
    if (!vendor) {
        return vendor;
    }

    const prisma = require('../config/db');
    const totalCompleted = await prisma.booking.count({
        where: {
            vendor_service: {
                vendor_id: vendor.vendor_id
            },
            booking_status: 'completed'
        }
    });

    const ratingSummary = await reviewRepository.getVendorRatingSummary(vendor.vendor_id);
    const sortedServices = Array.isArray(vendor.services)
        ? [...vendor.services].sort((left, right) => {
            if (left.approval_status === right.approval_status) {
                return (right.id || 0) - (left.id || 0);
            }

            if (left.approval_status === 'approved') {
                return -1;
            }

            if (right.approval_status === 'approved') {
                return 1;
            }

            return (right.id || 0) - (left.id || 0);
        })
        : vendor.services;

    return {
        ...vendor,
        ...ratingSummary,
        total_completed: totalCompleted,
        services: sortedServices,
    };
}

exports.getAllVendors = async () => {
    return await vendorRepository.findAllWithServices();
};

exports.getVendorById = async (id) => {
    const vendor = await vendorRepository.findVendorDetails(id);
    return await attachVendorInsights(vendor);
};

exports.getVendorProfile = async (vendorId) => {
    const vendor = await vendorRepository.findVendorDetails(vendorId);
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    return await attachVendorInsights(vendor);
};

exports.updateVendorProfile = async (vendorId, payload) => {
    await vendorRepository.updateProfile(vendorId, payload);
    return exports.getVendorProfile(vendorId);
};

exports.updateVendorStatus = async (id, status) => {
    return await vendorRepository.update(id, { approval_status: status }, 'vendor_id');
};

exports.getAllCategories = async () => {
    return await serviceCategoryRepository.findAll();
};

exports.saveVendorServices = async (vendorId, categories) => {
    const servicesData = categories.map(catId => ({
        vendor_id: vendorId,
        category_id: parseInt(catId, 10),
        service_title: 'General Service',
        approval_status: 'pending',
        status: 'pending',
        is_available: false,
    }));

    await vendorRepository.update(vendorId, {
        category_id: categories.length > 0 ? parseInt(categories[0], 10) : null
    }, 'vendor_id');

    const result = await vendorServiceRepository.createMany(servicesData);
    await syncVendorPrimaryCategory(vendorId);
    return result;
};

exports.addSpecificService = async (serviceData) => {
    try {
        const validatedPayload = validateVendorServicePayload(serviceData);
        const category = await serviceCategoryRepository.findById(validatedPayload.category_id, 'category_id');
        if (!category) {
            throw createValidationError('Selected category does not exist');
        }

        logger.info('Vendor submitted service for approval', {
            vendorId: serviceData.vendor_id,
            categoryId: validatedPayload.category_id,
            serviceTitle: validatedPayload.service_title,
        });

        const service = await vendorServiceRepository.create({
            vendor_id: serviceData.vendor_id,
            ...validatedPayload,
            approval_status: 'pending',
            status: 'pending',
        });

        await syncVendorPrimaryCategory(serviceData.vendor_id);
        return service;
    } catch (error) {
        logger.error('Failed to create vendor service', error, {
            vendorId: serviceData.vendor_id,
            categoryId: serviceData.category_id,
        });
        throw error;
    }
};

exports.updateSpecificService = async (serviceId, vendorId, serviceData) => {
    try {
        const existingService = await vendorServiceRepository.findById(serviceId, 'id');

        if (!existingService || existingService.vendor_id !== vendorId) {
            throw new Error('Service not found');
        }

        const validatedPayload = validateVendorServicePayload(serviceData);
        const category = await serviceCategoryRepository.findById(validatedPayload.category_id, 'category_id');
        if (!category) {
            throw createValidationError('Selected category does not exist');
        }

        const updated = await vendorServiceRepository.update(serviceId, {
            ...validatedPayload,
            approval_status: 'pending',
            status: 'pending',
        }, 'id');

        logger.info('Vendor updated service and reset it to pending approval', {
            serviceId,
            vendorId,
            categoryId: validatedPayload.category_id,
        });

        await syncVendorPrimaryCategory(vendorId);
        return updated;
    } catch (error) {
        logger.error('Failed to update vendor service', error, {
            serviceId,
            vendorId,
            categoryId: serviceData.category_id,
        });
        throw error;
    }
};

exports.updateServiceAvailability = async (serviceId, vendorId, isAvailable) => {
    const existingService = await vendorServiceRepository.findById(serviceId, 'id');

    if (!existingService || existingService.vendor_id !== vendorId) {
        throw new Error('Service not found');
    }

    const nextAvailability = Boolean(isAvailable);
    if (nextAvailability && existingService.approval_status !== 'approved') {
        throw createValidationError('Only approved services can be made available for users');
    }

    const service = await vendorServiceRepository.update(serviceId, {
        is_available: nextAvailability
    }, 'id');

    const vendor = await vendorRepository.findVendorDetails(vendorId);
    const services = Array.isArray(vendor?.services) ? vendor.services : [];
    const unavailableReason = authService.getVendorActivationBlockReason(vendor, services);

    if (vendor?.is_available && unavailableReason) {
        await vendorRepository.update(vendorId, { is_available: false }, 'vendor_id');
    }

    return service;
};

exports.getVendorAvailability = async (vendorId) => {
    const vendor = await vendorRepository.findVendorDetails(vendorId);
    const services = Array.isArray(vendor?.services) ? vendor.services : [];
    const schedule = await vendorAvailabilityRepository.findByVendor(vendorId);
    const unavailableReason = authService.getVendorActivationBlockReason(vendor, services);

    return {
        is_available: vendor?.is_available ?? false,
        can_enable: unavailableReason.length === 0,
        unavailable_reason: unavailableReason || null,
        schedule: mergeScheduleWithDefaults(schedule),
    };
};

exports.updateVendorAvailability = async (vendorId, payload) => {
    const updateData = {};
    if (payload.is_available !== undefined) {
        const nextAvailability = Boolean(payload.is_available);
        if (nextAvailability) {
            const vendor = await vendorRepository.findVendorDetails(vendorId);
            const services = Array.isArray(vendor?.services) ? vendor.services : [];
            const unavailableReason = authService.getVendorActivationBlockReason(vendor, services);

            if (unavailableReason) {
                throw createValidationError(unavailableReason);
            }
        }
        updateData.is_available = nextAvailability;
    }

    if (Object.keys(updateData).length > 0) {
        await vendorRepository.update(vendorId, updateData, 'vendor_id');
    }

    if (payload.schedule !== undefined) {
        const validatedSchedule = validateScheduleInput(payload.schedule);
        await vendorAvailabilityRepository.upsertSchedule(vendorId, validatedSchedule);
    }

    return exports.getVendorAvailability(vendorId);
};

exports.getVendorGallery = async (vendorId) => {
    const prisma = require('../config/db');
    return await prisma.vendorGallery.findMany({
        where: { vendor_id: vendorId },
        orderBy: { created_at: 'desc' },
    });
};

exports.addGalleryImage = async (vendorId, { image_url, caption }) => {
    const prisma = require('../config/db');
    return await prisma.vendorGallery.create({
        data: {
            vendor_id: vendorId,
            image_url,
            caption: caption || null,
        },
    });
};

exports.deleteGalleryImage = async (vendorId, id) => {
    const prisma = require('../config/db');
    const item = await prisma.vendorGallery.findUnique({ where: { id } });
    if (!item || item.vendor_id !== vendorId) {
        throw new Error('Not found');
    }
    return await prisma.vendorGallery.delete({ where: { id } });
};
