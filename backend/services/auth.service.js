const accountAuthService = require('./account-with-auth.service');
const passwordService = require('./password.service');
const profileService = require('./profile.service');
const sessionService = require('./auth/session.service');

module.exports = {
    ...accountAuthService,
    ...passwordService,
    ...profileService,
    ...sessionService
};
