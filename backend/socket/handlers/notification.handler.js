const registerNotificationHandlers = (socket) => {
    socket.on('support_message', (data) => {
        socket.to(data.userId).emit('support_message', {
            content: data.content,
            timestamp: new Date()
        });
    });

    socket.on('typing', (data) => {
        socket.to(data.room || 'support').emit('support_typing', {
            userId: socket.userId,
            isTyping: data.isTyping
        });
    });
};

module.exports = {
    registerNotificationHandlers
};
