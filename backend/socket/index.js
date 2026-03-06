const socketIo = require('socket.io');
const { authenticateSocket } = require('./middleware/auth.middleware');
const { getAllowedSocketOrigins, isAllowedSocketOrigin } = require('./events');
const { registerAuthHandlers } = require('./handlers/auth.handler');
const { registerNotificationHandlers } = require('./handlers/notification.handler');
const { registerTransactionHandlers } = require('./handlers/transaction.handler');

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

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        if (!supportChatEnabled) {
            return;
        }

        registerAuthHandlers(io, socket);
        registerNotificationHandlers(socket);
        registerTransactionHandlers(io, socket);
    });

    return io;
};

module.exports = configureSocket;
