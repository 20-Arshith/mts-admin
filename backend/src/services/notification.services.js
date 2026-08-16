const notificationRepository = require('../repositories/notification.repository');
const userRepository = require('../repositories/user.repository');
const pushService = require('./push.services');

exports.createNotification = async (data) => {
    const notification = await notificationRepository.create(data);

    try {
        // Fetch recipient's push token
        const recipient = await userRepository.getProfileInfo(data.recipient_user_id);
        if (recipient && recipient.expo_push_token) {
            await pushService.sendPushNotification(
                recipient.expo_push_token,
                data.title,
                data.message,
                { notificationId: notification.notification_id, bookingId: data.booking_id, type: data.type }
            );
        }
    } catch (error) {
        console.error('Failed to send push notification:', error);
    }

    return notification;
};

exports.getMyNotifications = async (userId, limit = 20) => {
    const notifications = await notificationRepository.findForRecipient(userId, limit);
    const unreadCount = await notificationRepository.countUnread(userId);

    return {
        notifications,
        unreadCount,
    };
};

exports.markNotificationRead = async (notificationId, userId) => {
    const notifications = await notificationRepository.findForRecipient(userId, 100);
    const ownsNotification = notifications.some(
        (item) => item.notification_id === notificationId
    );

    if (!ownsNotification) {
        throw new Error('Notification not found');
    }

    return await notificationRepository.markAsRead(notificationId, userId);
};

exports.markAllNotificationsRead = async (userId) => {
    return await notificationRepository.markAllAsRead(userId);
};
