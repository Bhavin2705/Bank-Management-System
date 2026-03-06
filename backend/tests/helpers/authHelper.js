const { api, withAuth } = require('./apiClient');
const { buildUserPayload } = require('./testData');

const registerUser = async (overrides = {}) => {
    const payload = buildUserPayload(overrides);
    const response = await api()
        .post('/api/auth/register')
        .send(payload);

    if (!response.body?.success || !response.body?.data?.user || !response.body?.data?.token) {
        throw new Error(`User registration failed in test helper (status: ${response.status}). Response: ${JSON.stringify(response.body)}`);
    }

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

    if (!loginResponse.body?.success || !loginResponse.body?.data?.token || !loginResponse.body?.data?.user) {
        throw new Error(`User login failed in test helper (status: ${loginResponse.status}). Response: ${JSON.stringify(loginResponse.body)}`);
    }

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
