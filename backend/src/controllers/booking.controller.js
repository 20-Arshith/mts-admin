const bookingService = require('../services/booking.services');
const { ROLES } = require('../utils/constants');

const requireUserSession = (req) => {
    const userId = Number(req.user?.user_id);

    if ((req.user?.role_id !== ROLES.USER && req.user?.role_id !== ROLES.VENDOR) || !Number.isInteger(userId) || userId <= 0) {
        const error = new Error('Please log in with a user account to continue');
        error.statusCode = 401;
        throw error;
    }

    return userId;
};

const requireVendorSession = (req) => {
    const userId = Number(req.user?.user_id);

    if (req.user?.role_id !== ROLES.VENDOR || !Number.isInteger(userId) || userId <= 0) {
        const error = new Error('Please log in with a vendor account to continue');
        error.statusCode = 401;
        throw error;
    }

    return userId;
};

exports.createBooking = async (req, res, next) => {
    try {
        const userId = requireUserSession(req);
        const payload = {
            vendor_service_id: Number(req.body.vendor_service_id),
            user_id: userId,
            address: req.body.address,
            total_price: req.body.total_price ? Number(req.body.total_price) : 0,
            scheduled_at: req.body.scheduled_at ? new Date(req.body.scheduled_at) : new Date(),
        };
        const booking = await bookingService.createBooking(payload);
        res.status(201).json({ success: true, data: booking });
    } catch (error) {
        if (
            error.message === 'Selected service is not available for booking' ||
            error.message === 'Vendor is not available for booking' ||
            error.message === 'Please select a valid booking time' ||
            error.message === 'Selected slot is no longer available' ||
            error.message === 'Selected slot is already booked'
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.getMyBookings = async (req, res, next) => {
    try {
        const bookings = await bookingService.getUserBookings(requireUserSession(req));
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
};

exports.getVendorBookings = async (req, res, next) => {
    try {
        const bookings = await bookingService.getVendorBookings(requireVendorSession(req));
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
};

exports.getMyBookingById = async (req, res, next) => {
    try {
        const booking = await bookingService.getUserBookingById(Number(req.params.id), requireUserSession(req));
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        if (error.message === 'Booking not found') {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        next(error);
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const booking = await bookingService.updateBookingStatus(
            Number(req.params.id),
            req.body.status,
            requireVendorSession(req),
            req.body.completion_otp
        );
        res.status(200).json({ success: true, message: 'Status updated', data: booking });
    } catch (error) {
        if (error.message === 'Booking not found') {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (
            error.message === 'Invalid booking status' ||
            error.message === 'This booking is already completed' ||
            error.message === 'This booking has already been cancelled' ||
            error.message === 'Only accepted orders can be marked as done' ||
            error.message === 'Please enter the user OTP to mark this order as done' ||
            error.message === 'Invalid OTP'
        ) {
            return res.status(error.statusCode || 400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.saveReview = async (req, res, next) => {
    try {
        const booking = await bookingService.saveReview(
            Number(req.params.id),
            requireUserSession(req),
            req.body
        );
        res.status(200).json({ success: true, message: 'Review saved', data: booking });
    } catch (error) {
        if (error.message === 'Completed booking not found') {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (error.message === 'Please provide a valid rating between 1 and 5') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};
