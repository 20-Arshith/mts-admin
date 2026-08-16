const BaseRepository = require('./base.repository');

class UserRepository extends BaseRepository {
    constructor() {
        super('user');
    }

    async findByMobile(mobile) {
        if (!mobile) {
            return null;
        }

        return await this.model.findUnique({
            where: { mobile },
            include: { 
                role: true, 
                profile: true,
                vendor: {
                    include: {
                        agent: true,
                        category: true,
                        services: {
                            include: { category: true }
                        }
                    }
                }
            }
        });
    }

    async findByEmail(email) {
        if (!email) {
            return null;
        }

        return await this.model.findUnique({
            where: { email },
            include: {
                role: true,
                profile: true,
                vendor: {
                    include: {
                        agent: true,
                        category: true,
                        services: {
                            include: { category: true }
                        }
                    }
                }
            }
        });
    }

    async findByContact(contact) {
        if (!contact) {
            return null;
        }

        const trimmedContact = contact.trim();
        if (trimmedContact.includes('@')) {
            return this.findByEmail(trimmedContact);
        }

        return this.findByMobile(trimmedContact);
    }

    async getProfileInfo(userId) {
        return await this.model.findUnique({
            where: { user_id: userId },
            include: { 
                role: true, 
                profile: true,
                vendor: {
                    include: {
                        agent: true,
                        category: true,
                        services: {
                            include: { category: true }
                        }
                    }
                }
            }
        });
    }

    async createUserWithProfile(userData, profileData) {
        return await this.model.create({
            data: {
                ...userData,
                profile: {
                    create: profileData
                }
            },
            include: { role: true, profile: true }
        });
    }

    async updateProfileInfo(userId, data) {
        const {
            full_name,
            email,
            mobile,
            address,
            latitude,
            longitude
        } = data;

        const normalizedEmail = typeof email === 'string' ? (email.trim() || null) : email;
        const normalizedMobile = typeof mobile === 'string' ? (mobile.trim() || null) : mobile;

        return await this.model.update({
            where: { user_id: userId },
            data: {
                ...(full_name !== undefined ? { full_name } : {}),
                ...(email !== undefined ? { email: normalizedEmail } : {}),
                ...(mobile !== undefined ? { mobile: normalizedMobile } : {}),
                profile: {
                    upsert: {
                        create: {
                            ...(address !== undefined ? { address } : {}),
                            ...(latitude !== undefined ? { latitude } : {}),
                            ...(longitude !== undefined ? { longitude } : {})
                        },
                        update: {
                            ...(address !== undefined ? { address } : {}),
                            ...(latitude !== undefined ? { latitude } : {}),
                            ...(longitude !== undefined ? { longitude } : {})
                        }
                    }
                }
            },
            include: {
                role: true,
                profile: true,
                vendor: {
                    include: {
                        agent: true,
                        category: true,
                        services: {
                            include: { category: true }
                        }
                    }
                }
            }
        });
    }

    async updatePushToken(userId, expoPushToken) {
        return await this.model.update({
            where: { user_id: userId },
            data: { expo_push_token: expoPushToken }
        });
    }
}

module.exports = new UserRepository();
