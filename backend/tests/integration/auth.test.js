const { api, withAuth } = require('../helpers/apiClient');
const { registerUser, loginUser } = require('../helpers/authHelper');
const { buildUserPayload } = require('../helpers/testData');

describe('Authentication API', () => {
    it('registers a new user', async () => {
        const { payload, response } = await registerUser();

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(payload.email);
        expect(response.body.data).toHaveProperty('token');
    });

    it('rejects invalid registration payload', async () => {
        const invalidPayload = buildUserPayload({ name: 'T1' });

        const response = await api()
            .post('/api/auth/register')
            .send(invalidPayload)
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    it('logs in an existing user', async () => {
        const { payload } = await registerUser();

        const response = await loginUser({
            identifier: payload.email,
            password: payload.password
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(payload.email);
        expect(response.body.data).toHaveProperty('token');
    });

    it('rejects invalid credentials', async () => {
        const response = await loginUser({
            identifier: 'missing@example.com',
            password: 'Wrong@1234'
        });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
    });

    it('refreshes token with a valid refresh token', async () => {
        const { response: registrationResponse } = await registerUser();
        const cookies = registrationResponse.headers['set-cookie'] || [];

        const response = await api()
            .post('/api/auth/refresh')
            .set('Cookie', cookies)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
    });

    it('rejects protected route access without token', async () => {
        const response = await api()
            .get('/api/auth/me')
            .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Not authorized to access this route');
    });

    it('returns current user for authenticated request', async () => {
        const { payload, token } = await registerUser();
        const loginResponse = await loginUser({
            identifier: payload.email,
            password: payload.password
        });
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data?.token).toBeDefined();

        const response = await api()
            .get('/api/auth/me')
            .set(withAuth(loginResponse.body.data?.token))
            .expect(200);

        expect(token).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(payload.email);
    });

    it('updates user details for authenticated user', async () => {
        const { payload } = await registerUser();
        const loginResponse = await loginUser({
            identifier: payload.email,
            password: payload.password
        });
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data?.token).toBeDefined();

        const response = await api()
            .put('/api/auth/updatedetails')
            .set(withAuth(loginResponse.body.data?.token))
            .send({ name: 'Updated Test User' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Test User');
    });

    it('updates password with valid current password', async () => {
        const { payload } = await registerUser();
        const loginResponse = await loginUser({
            identifier: payload.email,
            password: payload.password
        });
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data?.token).toBeDefined();

        const updateResponse = await api()
            .put('/api/auth/updatepassword')
            .set(withAuth(loginResponse.body.data?.token))
            .send({
                currentPassword: payload.password,
                newPassword: 'NewTest@1234'
            })
            .expect(200);

        expect(updateResponse.body.success).toBe(true);
        expect(updateResponse.body).toHaveProperty('message');

        const relogin = await loginUser({
            identifier: payload.email,
            password: 'NewTest@1234'
        });

        expect(relogin.status).toBe(200);
        expect(relogin.body.success).toBe(true);
    });
});
