const emailNotifier = require('./email/notifier');
const { createInAppNotification } = require('../utils/notifications');

const createNotification = async (payload) => {
    const notification = await createInAppNotification(payload);
    return !!notification;
};

const sendTransactionEmailIfEnabled = ({ user, details }) => {
    let emailSent = false;

    if (user?.preferences?.notifications?.email !== false) {
        emailNotifier.sendTransactionNotification(user.email, details)
            .then((sent) => {
                emailSent = !!sent;
            })
            .catch(() => { });
    }

    return emailSent;
};

module.exports = {
    createNotification,
    sendTransactionEmailIfEnabled
};
