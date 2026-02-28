const socketIo = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAutoResponse } = require('./autoResponses');
const { getAllowedSocketOrigins, isAllowedSocketOrigin } = require('./origins');

const configureSocket = (server) => {
    const allowedSocketOrigins = getAllowedSocketOrigins();
    const supportChatEnabled = String(process.env.SUPPORT_CHAT_ENABLED || '').toLowerCase() === 'true';

    const io = socketIo(server, {
        cors: {
            origin: (origin, callback) => {
                if (isAllowedSocketOrigin(origin, allowedSocketOrigins)) return callback(null, true);
                return callback(new Error(`Not allowed by Socket CORS: ${origin}`));
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        let token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
            const parsed = cookie.parse(socket.handshake.headers.cookie || '');
            token = parsed.token || parsed.Token || parsed['access_token'];
        }

        if (!token) {
            return next(new Error('Authentication error: token missing'));
        }

        try {
            if (!process.env.JWT_SECRET) {
                return next(new Error('Authentication error: server misconfigured'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded || decoded.tokenType !== 'access' || !decoded.id) {
                return next(new Error('Authentication error: invalid token type'));
            }

            socket.userId = decoded.id;

            try {
                const user = await User.findById(decoded.id).select('-password');
                socket.user = user ? user.toObject() : { id: decoded.id };
            } catch (dbErr) {
                console.warn('Socket auth: failed to load user from DB', dbErr && dbErr.message);
                socket.user = decoded;
            }

            next();
        } catch (err) {
            next(new Error('Authentication error: token invalid'));
        }
    });

    io.on('connection', (socket) => {
        if (!supportChatEnabled) {
            return;
        }

        socket.on('join_support', (data) => {
            socket.join('support');

            if (socket.user.role === 'admin') {
                socket.join('admin_support');
            }

            socket.to('support').emit('user_joined', {
                userId: data.userId,
                name: data.name,
                timestamp: new Date()
            });
        });

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
            } else {
                setTimeout(() => {
                    socket.emit('support_message', {
                        content: 'Your message has been received by our support team. A live agent will respond to you shortly.',
                        timestamp: new Date(),
                        isAutoResponse: true
                    });
                }, 500);
            }
        });

        socket.on('admin_response', (data) => {
            if (socket.user.role === 'admin') {
                io.to(data.userId).emit('support_message', {
                    content: data.content,
                    timestamp: new Date(),
                    agentName: socket.user.name,
                    isAutoResponse: false
                });

            }
        });

        socket.on('support_message', (data) => {
            io.to(data.userId).emit('support_message', {
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

    });

    return io;
};

module.exports = configureSocket;
