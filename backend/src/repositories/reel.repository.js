const BaseRepository = require('./base.repository');

class ReelRepository extends BaseRepository {
    constructor() {
        super('reel');
    }

    buildActiveReelWhere(where = {}) {
        return {
            ...where,
            approval_status: 'approved',
            status: 'approved',
            expiry_date: {
                gte: new Date(),
            },
            vendor: {
                approval_status: 'approved',
                is_available: true,
            },
        };
    }

    async findActiveReels(params = {}) {
        const existingWhere = params.where || {};
        const { where: _ignoredWhere, ...restParams } = params;

        return await this.model.findMany({
            ...restParams,
            where: this.buildActiveReelWhere(existingWhere),
            include: {
                vendor: {
                    select: {
                        business_name: true,
                        vendor_id: true,
                        mobile: true,
                        whatsapp_number: true,
                        category: {
                            select: {
                                category_name: true,
                            }
                        },
                        user: {
                            select: { 
                                full_name: true,
                                mobile: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async countActiveReels(where = {}) {
        return await this.model.count({
            where: this.buildActiveReelWhere(where),
        });
    }

    async findByVendor(vendorId, params = {}) {
        return await this.model.findMany({
            ...params,
            where: { vendor_id: vendorId },
            orderBy: { created_at: 'desc' }
        });
    }

    async countByVendor(vendorId) {
        return await this.model.count({
            where: { vendor_id: vendorId },
        });
    }

    async incrementViewCount(id) {
        return await this.model.update({
            where: { id },
            data: {
                view_count: {
                    increment: 1
                }
            }
        });
    }
}

module.exports = new ReelRepository();
