const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }


        // Check for token in cookies (if cookies are available)
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // Note: tokens must be provided in Authorization header as Bearer token or via cookies.

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'No user found with this token'
                });
            }
            // Attach full user document and a stable string id for handlers
            req.user = user;
            // Mongoose documents expose `id` as a string, but ensure a consistent field
            req.userId = user._id ? user._id.toString() : undefined;
            next();
        } catch (error) {
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

// Grant access to specific roles
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

// Check if user owns resource or is admin
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

            // Check if user owns the resource or is admin
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
