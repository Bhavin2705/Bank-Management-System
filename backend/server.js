const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('./middleware/cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

// Quick environment sanity checks (development-friendly)
const requiredEnv = ['NODE_ENV'];
if (process.env.NODE_ENV === 'development') {
    // Provide developer-friendly defaults for JWT secrets to avoid runtime crashes during local development.
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_me';
}

// Warn if essential env vars are missing in non-development environments.
if (process.env.NODE_ENV !== 'development') {
    const missing = requiredEnv.filter(e => !process.env[e]);
    if (missing.length) {
        console.warn('Warning: Missing environment variables:', missing.join(', '));
    }
}
// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const branchRoutes = require('./routes/branches');
const banksRoutes = require('./routes/banks');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security middleware
app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Data sanitization against NoSQL injection
app.use(xss()); // Data sanitization against XSS
app.use(hpp()); // Prevent HTTP Parameter Pollution

// CORS
app.use(cors);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle preflight requests
app.options('*', cors);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Bank Management API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/banks', banksRoutes);

// Socket.io middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    // Join support room
    socket.on('join_support', (data) => {
        socket.join('support');
        console.log(`User ${data.name} joined support chat`);

        // If user is admin, join admin support room
        if (socket.user.role === 'admin') {
            socket.join('admin_support');
            console.log(`Admin ${data.name} joined admin support room`);
        }

        // Notify support agents (in a real app, you'd have admin/support user detection)
        socket.to('support').emit('user_joined', {
            userId: data.userId,
            name: data.name,
            timestamp: new Date()
        });
    });

    // Handle user messages
    socket.on('user_message', (data) => {
        console.log('User message:', data);

        // Broadcast to admin support agents
        socket.to('admin_support').emit('new_user_message', {
            userId: socket.userId,
            name: data.name,
            content: data.content,
            timestamp: new Date()
        });

        // Only send auto-response if no admin is online
        const adminRoom = io.sockets.adapter.rooms.get('admin_support');
        const hasActiveAdmins = adminRoom && adminRoom.size > 0;

        if (!hasActiveAdmins) {
            // Auto-response system for demo (simulates support agent)
            setTimeout(() => {
                const autoResponse = generateAutoResponse(data.content);
                socket.emit('support_message', {
                    content: autoResponse,
                    timestamp: new Date(),
                    isAutoResponse: true
                });
            }, 2000); // 2 second delay to simulate human response time
        } else {
            // Notify user that message was sent to live agent
            setTimeout(() => {
                socket.emit('support_message', {
                    content: "Your message has been received by our support team. A live agent will respond to you shortly.",
                    timestamp: new Date(),
                    isAutoResponse: true
                });
            }, 500);
        }
    });

    // Handle manual admin responses
    socket.on('admin_response', (data) => {
        if (socket.user.role === 'admin') {
            // Send response to specific user
            io.to(data.userId).emit('support_message', {
                content: data.content,
                timestamp: new Date(),
                agentName: socket.user.name,
                isAutoResponse: false
            });

            console.log(`Admin ${socket.user.name} responded to user ${data.userId}`);
        }
    });

    // Auto-response generator function
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

        // Default response
        return "Thank you for contacting BankPro support. I've received your message and will do my best to assist you. For complex issues or immediate assistance, you can also call our 24/7 support line at 1-800-BANK-HELP or visit your nearest branch.";
    }

    // Handle support agent messages (for demo, allow any authenticated user to respond)
    socket.on('support_message', (data) => {
        // Send to specific user
        io.to(data.userId).emit('support_message', {
            content: data.content,
            timestamp: new Date()
        });
    });

    // Handle typing indicators
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

// 404 handler
app.all('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down the server due to Uncaught Exception');
    process.exit(1);
});

module.exports = app;
