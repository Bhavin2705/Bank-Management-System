const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }


        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }


        if (!token) {
            if (req.originalUrl && req.originalUrl.includes('/api/users/me/profile-photo')) {
                console.log('[profile-photo][auth] missing token', {
                    hasAuthHeader: !!req.headers.authorization,
                    hasCookie: !!(req.cookies && req.cookies.token)
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        try {
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({
                    success: false,
                    error: 'Authentication is not configured'
                });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'No user found with this token'
                });
            }
            if (user.status === 'suspended' || user.status === 'inactive') {
                return res.status(403).json({
                    success: false,
                    error: 'Your account has been blocked by admin.'
                });
            }
            req.user = user;
            req.userId = user._id ? user._id.toString() : undefined;
            next();
        } catch (error) {
            if (req.originalUrl && req.originalUrl.includes('/api/users/me/profile-photo')) {
                console.log('[profile-photo][auth] token verify failed', {
                    message: error?.message
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error in authentication'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

const resourceOwner = (modelName) => {
    return async (req, res, next) => {
        try {
            const Model = require(`../models/${modelName}`);
            const resource = await Model.findById(req.params.id);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    error: `${modelName} not found`
                });
            }

            if (resource.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to access this resource'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Server error checking resource ownership'
            });
        }
    };
};

module.exports = {
    protect,
    authorize,
    resourceOwner
};
