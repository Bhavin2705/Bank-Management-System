const socketIo = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const parseOrigins = (value) => (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getAllowedSocketOrigins = () => new Set([
    process.env.FRONTEND_URL,
    ...parseOrigins(process.env.FRONTEND_URLS),
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
].filter(Boolean));

const isAllowedSocketOrigin = (origin, allowedOrigins) => {
    if (!origin) return true;
    try {
        const parsed = new URL(origin);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return true;
        }
        if (parsed.hostname.endsWith('.vercel.app')) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return allowedOrigins.has(origin);
};

function generateAutoResponse(userMessage) {
    const message = userMessage.toLowerCase();

    if (message.includes('balance') || message.includes('check my balance')) {
        return "I can help you check your account balance. For security reasons, please log into your account dashboard to view your current balance. If you're having trouble accessing your account, I can guide you through the login process.";
    }

    if (message.includes('transfer') || message.includes('send money')) {
        return "To transfer money, you can use our Transfer Money feature in your dashboard. You'll need the recipient's account number or phone number. The transfer limit is $10,000 per day. Would you like me to guide you through the process?";
    }

    if (message.includes('card') || message.includes('pin') || message.includes('not working')) {
        return "I understand you're having card issues. For immediate assistance with lost, stolen, or malfunctioning cards, please call our 24/7 card services at 1-800-BANK-SECURE. I can also help you temporarily freeze your card through your account settings.";
    }

    if (message.includes('loan') || message.includes('credit')) {
        return "I'd be happy to help with loan information. We offer personal loans, auto loans, and home mortgages with competitive rates. You can view current rates and apply online through your dashboard. What type of loan are you interested in?";
    }

    if (message.includes('security') || message.includes('fraud') || message.includes('suspicious')) {
        return "Security is our top priority. If you suspect fraudulent activity, please call our fraud hotline immediately at 1-800-BANK-SECURE. I can also help you review recent transactions and set up account alerts.";
    }

    if (message.includes('branch') || message.includes('atm') || message.includes('location')) {
        return "You can find nearby branches and ATMs using our Branch Locator feature in your dashboard. Most branches are open Mon-Fri 9AM-5PM, Saturday 9AM-2PM. ATMs are available 24/7. Would you like me to help you find the nearest location?";
    }

    if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
        return "Hello! I'm here to help you with your banking needs. I can assist with account inquiries, transfers, card issues, loan information, and more. What can I help you with today?";
    }

    if (message.includes('thank') || message.includes('thanks')) {
        return "You're welcome! I'm glad I could help. If you have any other questions or need further assistance, please don't hesitate to ask. Have a great day!";
    }

    return "Thank you for contacting BankPro support. I've received your message and will do my best to assist you. For complex issues or immediate assistance, you can also call our 24/7 support line at 1-800-BANK-HELP or visit your nearest branch.";
}

const configureSocket = (server) => {
    const allowedSocketOrigins = getAllowedSocketOrigins();

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_change_me');

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
        console.log('User connected:', socket.userId);

        socket.on('join_support', (data) => {
            socket.join('support');
            console.log(`User ${data.name} joined support chat`);

            if (socket.user.role === 'admin') {
                socket.join('admin_support');
                console.log(`Admin ${data.name} joined admin support room`);
            }

            socket.to('support').emit('user_joined', {
                userId: data.userId,
                name: data.name,
                timestamp: new Date()
            });
        });

        socket.on('user_message', (data) => {
            console.log('User message:', data);

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

                console.log(`Admin ${socket.user.name} responded to user ${data.userId}`);
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

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.userId);
        });
    });

    return io;
};

module.exports = configureSocket;
