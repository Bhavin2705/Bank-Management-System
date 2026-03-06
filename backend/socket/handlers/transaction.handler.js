const { generateAutoResponse } = require('../autoResponses');

const registerTransactionHandlers = (io, socket) => {
    socket.on('user_message', (data) => {
        socket.to('admin_support').emit('new_user_message', {
            userId: socket.userId,
            name: data.name,
            content: data.content,
            timestamp: new Date()
        });

        const adminRoom = io.sockets.adapter.rooms.get('admin_support');
        const hasActiveAdmins = adminRoom && adminRoom.size > 0;

        if (!hasActiveAdmins) {
            setTimeout(() => {
                const autoResponse = generateAutoResponse(data.content);
                socket.emit('support_message', {
                    content: autoResponse,
                    timestamp: new Date(),
                    isAutoResponse: true
                });
            }, 2000);
            return;
        }

        setTimeout(() => {
            socket.emit('support_message', {
                content: 'Your message has been received by our support team. A live agent will respond to you shortly.',
                timestamp: new Date(),
                isAutoResponse: true
            });
        }, 500);
    });
};

module.exports = {
    registerTransactionHandlers
};
