const { api } = require('./helpers/apiClient');
const { createAuthenticatedUser, registerUser } = require('./helpers/authHelper');

describe('User API', () => {
    let authHeader;
    let userId;
    let email;
    let pin;

    beforeAll(async () => {
        const account = await createAuthenticatedUser();
        authHeader = account.authHeader;
        userId = account.user._id;
        email = account.payload.email;
        pin = account.payload.pin;
        await registerUser();
    });

    it('rejects regular user access to users list', async () => {
        const response = await api()
            .get('/api/users')
            .set(authHeader)
            .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not authorized');
    });

    it('returns own profile by id', async () => {
        const response = await api()
            .get(`/api/users/${userId}`)
            .set(authHeader)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(userId);
    });

    it('updates own profile', async () => {
        const response = await api()
            .put(`/api/users/${userId}`)
            .set(authHeader)
            .send({ name: 'Profile Updated User' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Profile Updated User');
    });

    it('checks email existence for registered email', async () => {
        const response = await api()
            .get('/api/users/check-email')
            .query({ email })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.exists).toBe(true);
    });

    it('validates pin for authenticated user', async () => {
        const response = await api()
            .post('/api/users/verify-pin')
            .set(authHeader)
            .send({ pin })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('PIN verified successfully');
    });

    it('returns transfer recipients list', async () => {
        const response = await api()
            .get('/api/users/transfer-recipients')
            .set(authHeader)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });
});
