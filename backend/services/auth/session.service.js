const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const {
    generateToken,
    getJwtRefreshSecret,
    cookieOptions,
    clearTokenCookieOptions,
    clearRefreshCookieOptions
} = require('../../helpers/auth.helpers');

const logout = async (req, res) => {
    try {
        res.clearCookie('token', clearTokenCookieOptions);
        res.clearCookie('refreshToken', clearRefreshCookieOptions);

        res.status(200).json({
            success: true,
            data: {},
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error during logout'
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        const refreshTokenFromBody = req.body && req.body.refreshToken;
        const refreshTokenFromCookie = req.cookies && req.cookies.refreshToken;
        const tokenToVerify = refreshTokenFromBody || refreshTokenFromCookie;

        if (!tokenToVerify) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(tokenToVerify, getJwtRefreshSecret());

        if (!decoded || decoded.tokenType !== 'refresh' || !decoded.id) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const token = generateToken(user._id);
        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            data: { token }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
};

module.exports = {
    logout,
    refreshToken
};
