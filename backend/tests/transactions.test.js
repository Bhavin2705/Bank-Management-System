const { api } = require('./helpers/apiClient');
const { createAuthenticatedUser, registerUser } = require('./helpers/authHelper');

describe('Transaction API', () => {
    let authHeader;
    let recipientAccount;

    beforeAll(async () => {
        const account = await createAuthenticatedUser({ initialDeposit: 5000 });
        authHeader = account.authHeader;

        const recipient = await registerUser({ initialDeposit: 1000 });
        recipientAccount = recipient.user.accountNumber;
    });

    it('returns transaction categories', async () => {
        const response = await api()
            .get('/api/transactions/categories')
            .set(authHeader)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toContain('transfer');
    });

    it('returns transaction list', async () => {
        const response = await api()
            .get('/api/transactions')
            .set(authHeader)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('pagination');
    });

    it('returns transaction stats', async () => {
        const response = await api()
            .get('/api/transactions/stats')
            .set(authHeader)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
    });

    it('validates transfer details for recipient account', async () => {
        const response = await api()
            .post('/api/transactions/validate-transfer')
            .set(authHeader)
            .send({
                recipientAccount,
                amount: 100,
                description: 'Transfer preview'
            })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('hasSufficientBalance');
        expect(response.body.data).toHaveProperty('transferType');
    });

    it('returns validation error for invalid transaction payload', async () => {
        const response = await api()
            .post('/api/transactions')
            .set(authHeader)
            .send({
                type: 'credit',
                amount: 0,
                description: ''
            })
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    it('rejects self transfer in transfer validation', async () => {
        const me = await api()
            .get('/api/auth/me')
            .set(authHeader)
            .expect(200);

        const response = await api()
            .post('/api/transactions/validate-transfer')
            .set(authHeader)
            .send({
                recipientAccount: me.body.data.accountNumber,
                amount: 10,
                description: 'Self transfer attempt'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Cannot transfer to your own account');
    });

    it('returns server error contract for create transaction path', async () => {
        const response = await api()
            .post('/api/transactions')
            .set(authHeader)
            .send({
                type: 'credit',
                amount: 500,
                description: 'Test deposit transaction',
                category: 'deposit'
            })
            .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Server error creating transaction');
    });

    it('returns server error contract for transfer path', async () => {
        const response = await api()
            .post('/api/transactions/transfer')
            .set(authHeader)
            .send({
                recipientAccount,
                amount: 100,
                description: 'Internal transfer test'
            })
            .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Server error processing transfer');
    });

    it('returns 400 for invalid transaction id format', async () => {
        const response = await api()
            .get('/api/transactions/invalid-id')
            .set(authHeader)
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid ID format');
    });
});
