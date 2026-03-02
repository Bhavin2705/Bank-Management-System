const { api, withAuth } = require('./apiClient');
const { buildUserPayload } = require('./testData');

const registerUser = async (overrides = {}) => {
    const payload = buildUserPayload(overrides);
    const response = await api()
        .post('/api/auth/register')
        .send(payload);

    return {
        payload,
        response,
        token: response.body?.data?.token,
        refreshToken: response.body?.data?.refreshToken,
        user: response.body?.data?.user
    };
};

const loginUser = async ({ identifier, password }) => api()
    .post('/api/auth/login')
    .send({ identifier, password });

const createAuthenticatedUser = async (overrides = {}) => {
    const registration = await registerUser(overrides);
    const loginResponse = await loginUser({
        identifier: registration.payload.email,
        password: registration.payload.password
    });

    return {
        payload: registration.payload,
        user: loginResponse.body?.data?.user,
        token: loginResponse.body?.data?.token,
        refreshToken: loginResponse.body?.data?.refreshToken,
        authHeader: withAuth(loginResponse.body?.data?.token),
        registrationResponse: registration.response,
        loginResponse
    };
};

module.exports = {
    registerUser,
    loginUser,
    createAuthenticatedUser
};
