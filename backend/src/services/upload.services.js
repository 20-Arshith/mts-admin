const { uploadImageBuffer } = require('../config/cloudinary');

const folders = {
    logo: 'mts-india/vendor-media/logos',
    banner: 'mts-india/vendor-media/banners',
    service_image: 'mts-india/vendor-media/services',
    gallery: 'mts-india/vendor-media/gallery',
    payout_proof: 'mts-india/admin-media/payout-proofs',
    announcement: 'mts-india/vendor-media/announcements',
    category_icon: 'mts-india/admin-media/category-icons',
};

exports.uploadImage = async (file, assetType = 'logo') => {
    if (!file?.buffer) {
        throw new Error('Image file is required');
    }

    const normalizedType = String(assetType || 'logo').toLowerCase();
    const folder = folders[normalizedType] || folders.logo;
    const result = await uploadImageBuffer(file.buffer, { folder });

    return {
        asset_type: normalizedType,
        url: result.secure_url,
        public_id: result.public_id,
    };
};
