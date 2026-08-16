const BaseRepository = require('./base.repository');

class BookingRepository extends BaseRepository {
    constructor() {
        super('booking');
    }

    async findUserBookings(userId) {
        return await this.model.findMany({
            where: { user_id: userId },
            include: {
                review: true,
                vendor_service: {
                    include: {
                        category: true,
                        vendor: {
                            include: {
                                user: { select: { mobile: true, full_name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findVendorBookings(vendorId) {
        return await this.model.findMany({
            where: {
                vendor_service: {
                    vendor_id: vendorId
                }
            },
            select: {
                booking_id: true,
                user_id: true,
                vendor_service_id: true,
                booking_status: true,
                booking_date: true,
                booking_time: true,
                scheduled_at: true,
                address: true,
                notes: true,
                commission_earned: true,
                total_price: true,
                created_at: true,
                updated_at: true,
                review: true,
                user: { include: { profile: true } },
                vendor_service: { include: { category: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findByIdForUser(bookingId, userId) {
        return await this.model.findFirst({
            where: {
                booking_id: bookingId,
                user_id: userId,
            },
            include: {
                review: true,
                vendor_service: {
                    include: {
                        category: true,
                        vendor: {
                            include: {
                                user: { select: { mobile: true, full_name: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    async findByIdWithVendor(bookingId) {
        return await this.model.findUnique({
            where: {
                booking_id: bookingId,
            },
            include: {
                vendor_service: {
                    select: {
                        vendor_id: true,
                    },
                },
            },
        });
    }

    async findVendorBookingsInRange(vendorId, start, end) {
        return await this.model.findMany({
            where: {
                scheduled_at: {
                    gte: start,
                    lt: end,
                },
                booking_status: {
                    notIn: ['cancelled'],
                },
                vendor_service: {
                    vendor_id: vendorId,
                },
            },
            select: {
                booking_id: true,
                scheduled_at: true,
            },
        });
    }

    async findVendorBookingConflict(vendorId, scheduledAt) {
        return await this.model.findFirst({
            where: {
                scheduled_at: scheduledAt,
                booking_status: {
                    notIn: ['cancelled'],
                },
                vendor_service: {
                    vendor_id: vendorId,
                },
            },
            select: {
                booking_id: true,
            },
        });
    }

    async findCompletedBookingForUser(bookingId, userId) {
        return await this.model.findFirst({
            where: {
                booking_id: bookingId,
                user_id: userId,
                booking_status: 'completed',
            },
            include: {
                review: true,
                vendor_service: {
                    include: {
                        category: true,
                        vendor: {
                            include: {
                                user: { select: { mobile: true, full_name: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    async findByIdWithDetails(bookingId) {
        return await this.model.findUnique({
            where: { booking_id: bookingId },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                vendor_service: {
                    include: {
                        category: true,
                        vendor: {
                            include: {
                                user: {
                                    select: {
                                        user_id: true,
                                        full_name: true,
                                        mobile: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
}

module.exports = new BookingRepository();
