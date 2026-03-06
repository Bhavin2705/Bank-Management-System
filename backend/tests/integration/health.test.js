const { api } = require('../helpers/apiClient');

describe('Health API', () => {
    it('returns service health details', async () => {
        const response = await api()
            .get('/health')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Bank Management API is running');
        expect(response.body).toHaveProperty('timestamp');
    });
});
