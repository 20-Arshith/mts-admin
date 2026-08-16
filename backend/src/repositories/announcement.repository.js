const BaseRepository = require('./base.repository');

class AnnouncementRepository extends BaseRepository {
    constructor() {
        super('announcement');
    }

    async findActiveByLocation(locationIdentifier) {
        const now = new Date();
        const location = String(locationIdentifier || '').trim();

        return await this.model.findMany({
            where: {
                is_active: true,
                approval_status: 'approved',
                status: 'approved',
                start_at: { lte: now },
                OR: [
                    { expires_at: null },
                    { expires_at: { gt: now } },
                ],
                ...(location
                    ? {
                        location_identifier: {
                            equals: location,
                            mode: 'insensitive',
                        },
                    }
                    : {}),
            },
            orderBy: [
                { created_at: 'asc' },
                { announcement_id: 'asc' },
            ],
        });
    }

    async findByVendor(vendorId) {
        return await this.model.findMany({
            where: { vendor_id: vendorId },
            orderBy: [
                { created_at: 'desc' },
                { announcement_id: 'desc' },
            ],
        });
    }

    async findVendorAnnouncement(announcementId, vendorId) {
        return await this.model.findFirst({
            where: {
                announcement_id: announcementId,
                vendor_id: vendorId,
            },
        });
    }
}

module.exports = new AnnouncementRepository();
