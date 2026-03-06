const registerAuthHandlers = (io, socket) => {
    socket.on('join_support', (data) => {
        socket.join('support');

        if (socket.user && socket.user.role === 'admin') {
            socket.join('admin_support');
        }

        socket.to('support').emit('user_joined', {
            userId: data.userId,
            name: data.name,
            timestamp: new Date()
        });
    });

    socket.on('admin_response', (data) => {
        if (socket.user && socket.user.role === 'admin') {
            io.to(data.userId).emit('support_message', {
                content: data.content,
                timestamp: new Date(),
                agentName: socket.user.name,
                isAutoResponse: false
            });
        }
    });
};

module.exports = {
    registerAuthHandlers
};
