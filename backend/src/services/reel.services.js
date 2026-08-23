const reelRepository = require('../repositories/reel.repository');
const { uploadVideoBuffer, buildVideoThumbnailUrl, destroyVideoByUrl } = require('../config/cloudinary');

const parsePagination = (query = {}, defaults = {}) => {
    const defaultPage = defaults.page || 1;
    const defaultLimit = defaults.limit || 8;
    const maxLimit = defaults.maxLimit || 24;
    const page = Math.max(1, parseInt(query.page, 10) || defaultPage);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
    };
};

exports.createReel = async (vendorId, data, file) => {
    if (!file?.buffer) {
        const error = new Error('Video file is required');
        error.statusCode = 400;
        throw error;
    }

    const uploadResult = await uploadVideoBuffer(file.buffer, {
        public_id: `vendor-${vendorId}-${Date.now()}`,
    });

    return await reelRepository.create({
        vendor_id: vendorId,
        video_url: uploadResult.secure_url,
        caption: data.caption?.trim() || null,
        category_id: data.category_id ? parseInt(data.category_id, 10) : null,
        thumbnail_url: buildVideoThumbnailUrl(uploadResult.public_id),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
};

exports.getAllReels = async (query = {}) => {
    const { category_id } = query;
    const params = {};
    if (category_id) {
        params.where = { category_id: parseInt(category_id) };
    }
    const pagination = parsePagination(query, { limit: 6, maxLimit: 20 });
    const [items, total] = await Promise.all([
        reelRepository.findActiveReels({
            ...params,
            skip: pagination.skip,
            take: pagination.take,
        }),
        reelRepository.countActiveReels(params.where),
    ]);

    return {
        items,
        meta: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            hasMore: pagination.skip + items.length < total,
        },
    };
};

exports.getVendorReels = async (vendorId, query = {}) => {
    const pagination = parsePagination(query, { limit: 10, maxLimit: 24 });
    const [items, total] = await Promise.all([
        reelRepository.findByVendor(vendorId, {
            skip: pagination.skip,
            take: pagination.take,
        }),
        reelRepository.countByVendor(vendorId),
    ]);

    return {
        items,
        meta: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            hasMore: pagination.skip + items.length < total,
        },
    };
};

exports.incrementViewCount = async (reelId) => {
    const parsedReelId = parseInt(reelId, 10);

    if (!Number.isInteger(parsedReelId) || parsedReelId <= 0) {
        const error = new Error('Invalid reel id');
        error.statusCode = 400;
        throw error;
    }

    const reel = await reelRepository.findById(parsedReelId);
    if (!reel || reel.approval_status !== 'approved' || reel.status !== 'approved') {
        const error = new Error('Reel not found');
        error.statusCode = 404;
        throw error;
    }

    return await reelRepository.incrementViewCount(parsedReelId);
};

exports.getReelStats = async (reelId) => {
    const parsedReelId = parseInt(reelId, 10);
    if (!Number.isInteger(parsedReelId) || parsedReelId <= 0) {
        const error = new Error('Invalid reel id');
        error.statusCode = 400;
        throw error;
    }
    
    const reel = await reelRepository.findById(parsedReelId);
    if (!reel) {
        const error = new Error('Reel not found');
        error.statusCode = 404;
        throw error;
    }
    return reel;
};

exports.deleteReel = async (reelId, vendorId) => {
    const reel = await reelRepository.findById(reelId, 'id');
    if (!reel || reel.vendor_id !== vendorId) {
        throw new Error('Reel not found or unauthorized');
    }

    await destroyVideoByUrl(reel.video_url).catch((error) => {
        console.error('Failed to delete Cloudinary reel asset:', error.message);
    });

    return await reelRepository.delete(reelId, 'id');
};
