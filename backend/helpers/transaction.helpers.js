const User = require('../models/User');

const roundTwo = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value) || 0;
    return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const findRecipientByAccountOrPhone = async (recipientAccount, recipientPhone) => {
    if (recipientAccount) {
        const recipient = await User.findOne({ accountNumber: recipientAccount });
        return { recipient, users: [] };
    }

    if (recipientPhone) {
        const users = await User.find({ phone: recipientPhone });
        if (users.length === 1) {
            return { recipient: users[0], users };
        }
        return { recipient: null, users };
    }

    return { recipient: null, users: [] };
};

const getTransferMeta = (recipient) => ({
    isInternalTransfer: !!recipient,
    transferType: recipient ? 'internal' : 'external'
});

module.exports = {
    roundTwo,
    findRecipientByAccountOrPhone,
    getTransferMeta
};
