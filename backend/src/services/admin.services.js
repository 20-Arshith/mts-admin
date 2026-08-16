const prisma = require('../config/db');
const logger = require('../utils/logger');
const { ROLES } = require('../utils/constants');
const { createValidationError, validateAgentOnboardingInput } = require('../utils/validation');
const authService = require('./auth.services');

const normalizeApprovalStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (['approved', 'approve', 'accepted', 'appected'].includes(normalized)) {
        return 'approved';
    }

    if (['rejected', 'reject', 'declined', 'decline'].includes(normalized)) {
        return 'rejected';
    }

    if (normalized === 'pending') {
        return 'pending';
    }

    return normalized || 'pending';
};

const mapServiceStatus = (service) => {
    const status = normalizeApprovalStatus(service?.status || service?.approval_status);

    return {
        ...service,
        approval_status: status,
        status,
    };
};

const normalizeCategoryIcon = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return 'general';
    }

    if (trimmed.startsWith('data:image/') || /^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return trimmed.toLowerCase();
};

const ensureContentApprovalColumns = async () => {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "reels"
        ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending'
    `);

    await prisma.$executeRawUnsafe(`
        ALTER TABLE "announcements"
        ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending'
    `);
};

const ensureServiceCategoryIconColumn = async () => {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "service_categories"
        ADD COLUMN IF NOT EXISTS "icon_name" TEXT NOT NULL DEFAULT 'general'
    `);
};

const mapServiceCategoryRow = (row) => ({
    category_id: Number(row.category_id),
    category_name: row.category_name,
    icon_name: row.icon_name || 'general',
    _count: {
        services: Number(row.service_count || 0),
        vendors: Number(row.vendor_count || 0),
    },
});

const findServiceCategoryByName = async (categoryName, excludedCategoryId = null) => {
    await ensureServiceCategoryIconColumn();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            sc.category_id,
            sc.category_name,
            COALESCE(sc.icon_name, 'general') AS icon_name
        FROM service_categories sc
        WHERE LOWER(sc.category_name) = LOWER($1)
          AND ($2::int IS NULL OR sc.category_id <> $2)
        LIMIT 1
    `, categoryName, excludedCategoryId == null ? null : Number(excludedCategoryId));

    return rows[0] || null;
};

const getServiceCategoryById = async (categoryId) => {
    await ensureServiceCategoryIconColumn();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            sc.category_id,
            sc.category_name,
            COALESCE(sc.icon_name, 'general') AS icon_name,
            COUNT(DISTINCT vs.id)::int AS service_count,
            COUNT(DISTINCT v.vendor_id)::int AS vendor_count
        FROM service_categories sc
        LEFT JOIN vendor_services vs ON vs.category_id = sc.category_id
        LEFT JOIN vendors v ON v.category_id = sc.category_id
        WHERE sc.category_id = $1
        GROUP BY sc.category_id, sc.category_name, sc.icon_name
    `, Number(categoryId));

    return rows[0] ? mapServiceCategoryRow(rows[0]) : null;
};

const ensurePayoutProofColumn = async () => {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "payout_requests"
        ADD COLUMN IF NOT EXISTS "proof_image_url" TEXT
    `);

    await prisma.$executeRawUnsafe(`
        ALTER TABLE "payout_requests"
        ALTER COLUMN "account_number" DROP NOT NULL,
        ALTER COLUMN "ifsc_code" DROP NOT NULL,
        ALTER COLUMN "bank_name" DROP NOT NULL
    `);

    await prisma.$executeRawUnsafe(`
        ALTER TABLE "payout_requests"
        ADD COLUMN IF NOT EXISTS "payout_method" TEXT NOT NULL DEFAULT 'BANK',
        ADD COLUMN IF NOT EXISTS "upi_id" TEXT
    `);
};

const mapPayoutRequestRow = (row) => ({
    payout_id: Number(row.payout_id),
    agent_id: Number(row.agent_id),
    amount: row.amount,
    account_number: row.account_number,
    ifsc_code: row.ifsc_code,
    bank_name: row.bank_name,
    payout_method: row.payout_method || 'BANK',
    upi_id: row.upi_id || null,
    status: row.status,
    proof_image_url: row.proof_image_url || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    agent: {
        name: row.agent_name,
        mobile: row.agent_mobile,
    },
});

const getPayoutRequestById = async (payoutId) => {
    await ensurePayoutProofColumn();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            pr.payout_id,
            pr.agent_id,
            pr.amount,
            pr.account_number,
            pr.ifsc_code,
            pr.bank_name,
            pr.payout_method,
            pr.upi_id,
            pr.status,
            pr.proof_image_url,
            pr.created_at,
            pr.updated_at,
            a.name AS agent_name,
            a.mobile AS agent_mobile
        FROM payout_requests pr
        INNER JOIN agents a ON a.agent_id = pr.agent_id
        WHERE pr.payout_id = $1
        LIMIT 1
    `, Number(payoutId));

    return rows[0] ? mapPayoutRequestRow(rows[0]) : null;
};

const syncServiceCategorySequence = async () => {
    await ensureServiceCategoryIconColumn();
    await prisma.$executeRawUnsafe(`
        SELECT setval(
            pg_get_serial_sequence('service_categories', 'category_id'),
            COALESCE((SELECT MAX(category_id) FROM "service_categories"), 0) + 1,
            false
        )
    `);
};

exports.getStats = async () => {
    const [agentsCount, vendorsCount, usersCount, bookingsCount, pendingPayouts] = await Promise.all([
        prisma.agent.count(),
        prisma.vendor.count(),
        prisma.user.count({ where: { role_id: 1 } }),
        prisma.booking.count(),
        prisma.payoutRequest.aggregate({
            _sum: { amount: true },
            where: { status: 'pending' }
        })
    ]);

    return {
        agents: agentsCount,
        vendors: vendorsCount,
        users: usersCount,
        bookings: bookingsCount,
        pendingPayoutAmount: pendingPayouts._sum.amount || 0
    };
};

exports.getAllAgents = async () => {
    return await prisma.agent.findMany({
        include: {
            _count: {
                select: { vendors: true }
            }
        },
        orderBy: { created_at: 'desc' }
    });
};

exports.getAllUsers = async () => {
    return await prisma.user.findMany({
        where: {
            role_id: ROLES.USER,
        },
        include: {
            role: true,
            profile: true,
            _count: {
                select: {
                    bookings: true,
                    reviews: true,
                    notifications: true,
                },
            },
        },
        orderBy: { created_at: 'desc' },
    });
};

exports.updateAgentStatus = async (agentId, status) => {
    const normalizedStatus = normalizeApprovalStatus(status);
    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
        throw createValidationError('Invalid agent status');
    }

    return await prisma.agent.update({
        where: { agent_id: parseInt(agentId, 10) },
        data: { approval_status: normalizedStatus }
    });
};

exports.getAllVendors = async () => {
    return await prisma.vendor.findMany({
        include: {
            user: {
                include: { profile: true }
            },
            agent: {
                select: { name: true, mobile: true, referral_code: true, approval_status: true }
            },
            category: true,
            services: {
                include: { category: true }
            },
            availability_schedule: {
                orderBy: { day_of_week: 'asc' }
            }
        },
        orderBy: { user: { created_at: 'desc' } }
    });
};

exports.onboardVendor = async (vendorInput) => {
    const result = await authService.registerVendor(vendorInput, { createdByAdmin: true });
    const vendorId = result?.vendor?.vendor_id || result?.user?.user_id;

    if (!vendorId) {
        return result;
    }

    return await prisma.vendor.findUnique({
        where: { vendor_id: Number(vendorId) },
        include: {
            user: {
                include: { profile: true }
            },
            agent: {
                select: { name: true, mobile: true, referral_code: true, approval_status: true }
            },
            category: true,
            services: {
                include: { category: true }
            },
            availability_schedule: {
                orderBy: { day_of_week: 'asc' }
            }
        },
    });
};

exports.updateVendorStatus = async (vendorId, status) => {
    const normalizedStatus = normalizeApprovalStatus(status);
    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
        throw createValidationError('Invalid vendor status');
    }

    return await prisma.vendor.update({
        where: { vendor_id: parseInt(vendorId, 10) },
        data: {
            approval_status: normalizedStatus,
            ...(normalizedStatus === 'approved' ? { is_available: true } : {}),
        }
    });
};

exports.getAllPayoutRequests = async () => {
    await ensurePayoutProofColumn();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            pr.payout_id,
            pr.agent_id,
            pr.amount,
            pr.account_number,
            pr.ifsc_code,
            pr.bank_name,
            pr.payout_method,
            pr.upi_id,
            pr.status,
            pr.proof_image_url,
            pr.created_at,
            pr.updated_at,
            a.name AS agent_name,
            a.mobile AS agent_mobile
        FROM payout_requests pr
        INNER JOIN agents a ON a.agent_id = pr.agent_id
        ORDER BY pr.created_at DESC
    `);

    return rows.map(mapPayoutRequestRow);
};

exports.getAllPayins = async () => {
    return await prisma.booking.findMany({
        where: {
            total_price: {
                not: null
            }
        },
        include: {
            user: { select: { full_name: true, mobile: true, email: true } },
            vendor_service: {
                include: {
                    vendor: { select: { business_name: true, mobile: true } },
                    category: true
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
};

exports.updatePayoutStatus = async (payoutId, status, proofImageUrl) => {
    const normalizedStatus = normalizeApprovalStatus(status);
    const normalizedProofUrl = String(proofImageUrl || '').trim();

    if (!['pending', 'completed', 'rejected'].includes(normalizedStatus)) {
        throw new Error('Invalid payout status');
    }

    if (normalizedStatus !== 'pending' && !normalizedProofUrl) {
        throw new Error('Payout proof image is required');
    }

    await ensurePayoutProofColumn();

    const rows = await prisma.$queryRawUnsafe(`
        UPDATE payout_requests
        SET status = $1,
            proof_image_url = COALESCE($2, proof_image_url),
            updated_at = NOW()
        WHERE payout_id = $3
        RETURNING payout_id
    `, normalizedStatus, normalizedProofUrl || null, parseInt(payoutId, 10));

    if (!rows[0]) {
        throw new Error('Payout request not found');
    }

    return await getPayoutRequestById(payoutId);
};

exports.getAllBookings = async () => {
    return await prisma.booking.findMany({
        include: {
            user: { select: { full_name: true, mobile: true } },
            vendor_service: {
                include: {
                    vendor: { select: { business_name: true } },
                    category: true
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
};

exports.getAllReels = async (query = {}) => {
    await ensureContentApprovalColumns();
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.reel.findMany({
            skip,
            take: limit,
            include: {
                vendor: {
                    select: {
                        business_name: true,
                        owner_name: true,
                        mobile: true,
                        category: {
                            select: { category_name: true }
                        },
                        user: {
                            select: {
                                full_name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        }),
        prisma.reel.count(),
    ]);

    return {
        items,
        meta: {
            page,
            limit,
            total,
            hasMore: skip + items.length < total,
        },
    };
};

exports.updateReelStatus = async (id, status) => {
    await ensureContentApprovalColumns();
    const normalizedStatus = normalizeApprovalStatus(status);
    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
        throw new Error('Invalid reel status');
    }

    return await prisma.reel.update({
        where: { id: parseInt(id, 10) },
        data: {
            approval_status: normalizedStatus,
            status: normalizedStatus,
        },
        include: {
            vendor: {
                select: {
                    business_name: true,
                    owner_name: true,
                    mobile: true,
                    category: { select: { category_name: true } },
                    user: { select: { full_name: true, email: true } },
                },
            },
        },
    });
};

exports.deleteReel = async (id) => {
    return await prisma.reel.delete({
        where: { id: parseInt(id, 10) }
    });
};

exports.getAllAnnouncements = async (query = {}) => {
    await ensureContentApprovalColumns();
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 24));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.announcement.findMany({
            skip,
            take: limit,
            include: {
                vendor: {
                    select: {
                        vendor_id: true,
                        business_name: true,
                        owner_name: true,
                        mobile: true,
                        user: { select: { full_name: true, email: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        }),
        prisma.announcement.count(),
    ]);

    return {
        items,
        meta: {
            page,
            limit,
            total,
            hasMore: skip + items.length < total,
        },
    };
};

exports.updateAnnouncementStatus = async (id, status) => {
    await ensureContentApprovalColumns();
    const normalizedStatus = normalizeApprovalStatus(status);
    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
        throw new Error('Invalid announcement status');
    }

    return await prisma.announcement.update({
        where: { announcement_id: parseInt(id, 10) },
        data: {
            approval_status: normalizedStatus,
            status: normalizedStatus,
        },
        include: {
            vendor: {
                select: {
                    vendor_id: true,
                    business_name: true,
                    owner_name: true,
                    mobile: true,
                    user: { select: { full_name: true, email: true } },
                },
            },
        },
    });
};

exports.getAllServices = async () => {
    const services = await prisma.vendorService.findMany({
        include: {
            vendor: { select: { business_name: true } },
            category: { select: { category_name: true } }
        },
        orderBy: { id: 'desc' }
    });

    return services.map(mapServiceStatus);
};

exports.getAllServiceCategories = async () => {
    await ensureServiceCategoryIconColumn();
    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            sc.category_id,
            sc.category_name,
            COALESCE(sc.icon_name, 'general') AS icon_name,
            COUNT(DISTINCT vs.id)::int AS service_count,
            COUNT(DISTINCT v.vendor_id)::int AS vendor_count
        FROM service_categories sc
        LEFT JOIN vendor_services vs ON vs.category_id = sc.category_id
        LEFT JOIN vendors v ON v.category_id = sc.category_id
        GROUP BY sc.category_id, sc.category_name, sc.icon_name
        ORDER BY sc.category_name ASC
    `);

    return rows.map(mapServiceCategoryRow);
};

exports.createServiceCategory = async (categoryName, iconName) => {
    const normalizedName = String(categoryName || '').trim();
    const normalizedIconName = normalizeCategoryIcon(iconName);

    if (!normalizedName) {
        throw new Error('Category name is required');
    }

    const existingCategory = await findServiceCategoryByName(normalizedName);

    if (existingCategory) {
        throw new Error('A service category with this name already exists');
    }

    await syncServiceCategorySequence();

    try {
        const insertedRows = await prisma.$queryRawUnsafe(`
            INSERT INTO "service_categories" ("category_name", "icon_name")
            VALUES ($1, $2)
            RETURNING "category_id"
        `, normalizedName, normalizedIconName);

        return await getServiceCategoryById(insertedRows[0]?.category_id);
    } catch (error) {
        if (error.code === 'P2002') {
            await syncServiceCategorySequence();
            const insertedRows = await prisma.$queryRawUnsafe(`
                INSERT INTO "service_categories" ("category_name", "icon_name")
                VALUES ($1, $2)
                RETURNING "category_id"
            `, normalizedName, normalizedIconName);

            return await getServiceCategoryById(insertedRows[0]?.category_id);
        }

        throw error;
    }
};

exports.updateServiceCategory = async (categoryId, categoryName, iconName) => {
    const normalizedCategoryId = parseInt(categoryId, 10);
    const normalizedName = String(categoryName || '').trim();
    const normalizedIconName = normalizeCategoryIcon(iconName);

    if (!normalizedName) {
        throw new Error('Category name is required');
    }

    await ensureServiceCategoryIconColumn();

    const existingCategory = await getServiceCategoryById(normalizedCategoryId);

    if (!existingCategory) {
        throw new Error('Service category not found');
    }

    const duplicateCategory = await findServiceCategoryByName(normalizedName, normalizedCategoryId);

    if (duplicateCategory) {
        throw new Error('A service category with this name already exists');
    }

    await prisma.$executeRawUnsafe(`
        UPDATE "service_categories"
        SET "category_name" = $1, "icon_name" = $2
        WHERE "category_id" = $3
    `, normalizedName, normalizedIconName, normalizedCategoryId);

    return await getServiceCategoryById(normalizedCategoryId);
};

exports.deleteServiceCategory = async (categoryId) => {
    const normalizedCategoryId = parseInt(categoryId, 10);
    const category = await getServiceCategoryById(normalizedCategoryId);

    if (!category) {
        throw new Error('Service category not found');
    }

    if ((category._count?.services || 0) > 0 || (category._count?.vendors || 0) > 0) {
        throw new Error('This category is already linked to vendors or services and cannot be deleted');
    }

    return await prisma.serviceCategory.delete({
        where: { category_id: normalizedCategoryId },
    });
};

exports.updateServiceStatus = async (id, status) => {
    const normalizedStatus = normalizeApprovalStatus(status);

    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
        throw new Error('Invalid service status');
    }

    const service = await prisma.vendorService.update({
        where: { id: parseInt(id, 10) },
        data: {
            approval_status: normalizedStatus,
            status: normalizedStatus,
        }
    });

    const vendorServices = await prisma.vendorService.findMany({
        where: {
            vendor_id: service.vendor_id,
        },
        orderBy: { id: 'desc' }
    });

    const primaryCategoryId = vendorServices.find((vendorService) => normalizeApprovalStatus(vendorService.status || vendorService.approval_status) === 'approved')?.category_id
        ?? vendorServices[0]?.category_id
        ?? null;

    await prisma.vendor.update({
        where: { vendor_id: service.vendor_id },
        data: { category_id: primaryCategoryId }
    });

    logger.info('Admin updated service approval status', {
        serviceId: service.id,
        vendorId: service.vendor_id,
        status: normalizedStatus,
        primaryCategoryId,
    });

    return mapServiceStatus(service);
};

exports.deleteService = async (id) => {
    return await prisma.vendorService.delete({
        where: { id: parseInt(id, 10) }
    });
};

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function generateUniqueReferralCode() {
    const generate = () => {
        const part = (n) =>
            Array.from({ length: n }, () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]).join('');

        return `AGT-${part(4)}-${part(4)}`;
    };

    let attempts = 0;
    while (attempts < 20) {
        const code = generate();
        const existing = await prisma.agent.findUnique({ where: { referral_code: code } });
        if (!existing) {
            return code;
        }
        attempts += 1;
    }

    throw new Error('Could not generate a unique referral code. Please try again.');
}

exports.onboardAgent = async ({ mobile, full_name, email }) => {
    const sanitizedInput = validateAgentOnboardingInput({ mobile, full_name, email });
    const { mobile: normalizedMobile, full_name: normalizedFullName, email: normalizedEmail } = sanitizedInput;

    const existingMobile = normalizedMobile ? await prisma.agent.findUnique({ where: { mobile: normalizedMobile } }) : null;
    if (existingMobile) {
        throw new Error('An agent with this phone number already exists');
    }

    const existingEmail = normalizedEmail ? await prisma.agent.findUnique({ where: { email: normalizedEmail } }) : null;
    if (existingEmail) {
        throw new Error('An agent with this email already exists');
    }

    const referralCode = await generateUniqueReferralCode();

    const agent = await prisma.agent.create({
        data: {
            name: normalizedFullName,
            mobile: normalizedMobile,
            email: normalizedEmail,
            referral_code: referralCode,
            approval_status: 'pending',
            commission_balance: 0
        }
    });

    logger.info('Admin onboarded new agent', {
        agentId: agent.agent_id,
        mobile: agent.mobile,
        email: agent.email,
    });

    return agent;
};

exports.findAgentByPhone = async (mobile) => {
    return await prisma.agent.findUnique({
        where: { mobile }
    });
};
