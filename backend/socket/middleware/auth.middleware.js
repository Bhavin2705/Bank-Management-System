const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const authenticateSocket = async (socket, next) => {
    let token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
        const parsed = cookie.parse(socket.handshake.headers.cookie || '');
        token = parsed.token || parsed.Token || parsed.access_token;
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

        return next();
    } catch (err) {
        return next(new Error('Authentication error: token invalid'));
    }
};

module.exports = {
    authenticateSocket
};
