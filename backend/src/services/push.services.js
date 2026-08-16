const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
let expo = new Expo();

/**
 * Sends a push notification to a specific Expo Push Token.
 * 
 * @param {string} pushToken The recipient's Expo Push Token
 * @param {string} title The title of the notification
 * @param {string} message The body of the notification
 * @param {object} data Optional custom data payload
 */
exports.sendPushNotification = async (pushToken, title, message, data = {}) => {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return;
    }

    // Construct a message
    const messages = [];
    messages.push({
        to: pushToken,
        sound: 'default',
        title: title,
        body: message,
        data: data,
    });

    // The Expo push notification service accepts batches of notifications so
    // that you don't need to send 1000 requests to send 1000 notifications.
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send the chunks to the Expo push notification service
    for (let chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
        }
    }

    // Optional: You could later process the tickets to handle errors/unregistered tokens
    return tickets;
};
