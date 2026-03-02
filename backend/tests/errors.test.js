const { api } = require('./helpers/apiClient');
const { createAuthenticatedUser } = require('./helpers/authHelper');

describe('Error Handling API', () => {
    let authHeader;

    beforeAll(async () => {
        const account = await createAuthenticatedUser();
        authHeader = account.authHeader;
    });

    it('returns 404 for unknown route', async () => {
        const response = await api()
            .get('/api/route-that-does-not-exist')
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Route /api/route-that-does-not-exist not found');
    });

    it('returns 401 on protected route without token', async () => {
        const response = await api()
            .get('/api/transactions')
            .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Not authorized to access this route');
    });

    it('returns 400 for invalid object id on user route', async () => {
        const response = await api()
            .get('/api/users/invalid-id')
            .set(authHeader)
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid ID format');
    });
});
