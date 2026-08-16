const jwt = require('jsonwebtoken');
const config = require('../config/config');
const authService = require('../services/auth.services');
const userRepository = require('../repositories/user.repository');
const agentRepository = require('../repositories/agent.repository');
const { ROLES } = require('../utils/constants');

exports.sendOtp = async (req, res, next) => {
    try {
        const contact = (req.body.contact || req.body.mobile || '').trim();
        const actorType = req.body.actorType;

        if (!contact) {
            return res.status(400).json({ success: false, message: "Mobile number or email is required" });
        }

        // Bypass actual OTP sending for login as requested by user
        res.status(200).json({
            success: true,
            message: "OTP bypassed for login",
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const contact = (req.body.contact || req.body.mobile || '').trim();
        const actorType = req.body.actorType;
        const otp = req.body.otp;

        if (!contact) {
            return res.status(400).json({ success: false, message: "Mobile number or email is required" });
        }

        // Direct login enabled - OTP verification bypassed
        if (otp && otp !== '123456') {
            try {
                await authService.verifyOtp(contact, otp);
            } catch (otpErr) {
                // Ignore OTP check failure to allow direct login
            }
        }

        // Vendor self-onboarding: verify OTP and signal that registration details are still needed.
        // We intentionally skip the agent/user path to avoid creating a USER-role record
        // that would interfere with the subsequent /auth/register-vendor call.
        if (actorType === 'vendor_registration') {
            return res.status(200).json({
                success: true,
                message: 'OTP verified. Please complete your registration.',
                registrationRequired: true,
            });
        }

        if (actorType === 'vendor') {
            const vendor = await authService.validateVendorAccess(contact);
            const user = vendor.user;

            const token = jwt.sign(
                { user_id: user.user_id, role_id: user.role_id, actor_type: 'vendor' },
                config.jwtSecret,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                message: "Login successful",
                token,
                actorType: 'vendor',
                user: await userRepository.getProfileInfo(user.user_id),
                vendor
            });
        }

        let agent = null;
        if (actorType === 'agent') {
            agent = await authService.validateAgentAccess(contact);
        } else if (!actorType) {
            const matchingAgent = await agentRepository.findByContact(contact);
            if (matchingAgent) {
                agent = await authService.validateAgentAccess(contact);
            }
        }

        if (agent) {
            const token = jwt.sign(
                { agent_id: agent.agent_id, role_id: ROLES.AGENT, actor_type: 'agent' },
                config.jwtSecret,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                message: "Login successful",
                token,
                actorType: 'agent',
                user: agent,
                agent
            });
        }

        let user = await userRepository.findByContact(contact);

        if (!user) {
            await userRepository.model.create({
                data: {
                    ...(contact.includes('@') ? { email: contact } : { mobile: contact }),
                    full_name: 'User',
                    role_id: ROLES.USER,
                    status: 'active'
                }
            });

            user = await userRepository.findByContact(contact);
        }

        const registrationRequired = !authService.isUserRegistrationComplete(user);

        const token = jwt.sign(
            { user_id: user.user_id, role_id: user.role_id },
            config.jwtSecret,
            { expiresIn: '7d' }
        );

        res.status(200).json({ 
            success: true, 
            message: registrationRequired ? "Registration required" : "Login successful", 
            token,
            actorType: 'user',
            registrationRequired,
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.validateAgentReferralCode = async (req, res, next) => {
    try {
        const agentCode = req.body.agent_code || req.body.agentCode || '';
        const agent = await authService.validateAgentReferralCode(agentCode);

        res.status(200).json({
            success: true,
            message: 'Agent code is valid',
            data: {
                agent_id: agent.agent_id,
                name: agent.name,
                referral_code: agent.referral_code,
                approval_status: agent.approval_status,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.registerVendor = async (req, res, next) => {
    try {
        const result = await authService.registerVendor(req.body);
        
        const token = jwt.sign(
            { user_id: result.user.user_id, role_id: result.user.role_id },
            config.jwtSecret,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Vendor registered successfully",
            token,
            user: result.user,
            vendor: result.vendor
        });
    } catch (error) {
        next(error);
    }
};

exports.registerAgent = async (req, res, next) => {
    try {
        const agent = await authService.registerAgent(req.body);

        const token = jwt.sign(
            { agent_id: agent.agent_id, role_id: ROLES.AGENT, actor_type: 'agent' },
            config.jwtSecret,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Agent registered successfully",
            token,
            actorType: 'agent',
            user: agent,
            agent
        });
    } catch (error) {
        next(error);
    }
};
