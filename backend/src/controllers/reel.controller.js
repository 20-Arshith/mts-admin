const reelService = require('../services/reel.services');

exports.uploadReel = async (req, res, next) => {
    try {
        const vendorId = req.user.user_id; // vendor_id is the same as user_id
        const reel = await reelService.createReel(vendorId, req.body, req.file);
        res.status(201).json({ success: true, data: reel });
    } catch (error) {
        next(error);
    }
};

exports.getReels = async (req, res, next) => {
    try {
        const reels = await reelService.getAllReels(req.query);
        res.status(200).json({ success: true, data: reels.items, meta: reels.meta });
    } catch (error) {
        next(error);
    }
};

exports.getMyReels = async (req, res, next) => {
    try {
        const vendorId = req.user.user_id;
        const reels = await reelService.getVendorReels(vendorId, req.query);
        res.status(200).json({ success: true, data: reels.items, meta: reels.meta });
    } catch (error) {
        next(error);
    }
};

exports.recordView = async (req, res, next) => {
    try {
        const reel = await reelService.incrementViewCount(req.params.id);
        res.status(200).json({
            success: true,
            data: {
                id: reel.id,
                view_count: reel.view_count,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.removeReel = async (req, res, next) => {
    try {
        const vendorId = req.user.user_id;
        const { id } = req.params;
        await reelService.deleteReel(parseInt(id), vendorId);
        res.status(200).json({ success: true, message: 'Reel deleted' });
    } catch (error) {
        next(error);
    }
};

exports.getReelStats = async (req, res, next) => {
    try {
        const reel = await reelService.getReelStats(req.params.id);
        res.status(200).json({
            success: true,
            data: {
                id: reel.id,
                view_count: reel.view_count,
            },
        });
    } catch (error) {
        next(error);
    }
};
