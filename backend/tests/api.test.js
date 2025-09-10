const request = require('supertest');

const BASE_URL = 'http://localhost:5000';

describe('Bank Management API Tests', () => {
    let userToken;
    let adminToken;
    let testUser;
    let testTransaction;

    describe('Health Check', () => {
        it('should return API health status', async () => {
            const res = await request(BASE_URL)
                .get('/health')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Bank Management API is running');
        });
    });

    describe('Authentication', () => {
        it('should register a new user', async () => {
            const timestamp = Date.now();
            const userData = {
                name: 'Test User',
                email: `test${timestamp}@example.com`,
                phone: `98765432${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
                password: 'Test@123',
                initialDeposit: 1000
            };

            const res = await request(BASE_URL)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toHaveProperty('email', userData.email);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refreshToken');

            testUser = res.body.data.user;
            userToken = res.body.data.token;
        });

        it('should login user', async () => {
            const loginData = {
                identifier: testUser.email,
                password: 'Test@123'
            };

            const res = await request(BASE_URL)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user).toHaveProperty('email', testUser.email);

            userToken = res.body.data.token;
        });

        it('should reject invalid login', async () => {
            const loginData = {
                identifier: 'invalid@example.com',
                password: 'wrongpassword'
            };

            const res = await request(BASE_URL)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should refresh token', async () => {
            const refreshData = {
                refreshToken: 'some-refresh-token' // This will fail but tests the endpoint
            };

            const res = await request(BASE_URL)
                .post('/api/auth/refresh')
                .send(refreshData)
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Protected Auth Routes', () => {
        it('should get current user', async () => {
            const res = await request(BASE_URL)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('email', testUser.email);
        });

        it('should update user details', async () => {
            const updateData = {
                name: 'Updated Test User'
            };

            const res = await request(BASE_URL)
                .put('/api/auth/updatedetails')
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Updated Test User');
        });

        it('should handle forgot password', async () => {
            const res = await request(BASE_URL)
                .post('/api/auth/forgotpassword')
                .send({ email: testUser.email })
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('should reject access without token', async () => {
            const res = await request(BASE_URL)
                .get('/api/auth/me')
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Not authorized to access this route');
        });
    });

    describe('Transaction Routes', () => {
        beforeAll(async () => {
            // Re-login to get fresh token
            const loginData = {
                identifier: testUser.email,
                password: 'Test@123'
            };

            const res = await request(BASE_URL)
                .post('/api/auth/login')
                .send(loginData);

            userToken = res.body.data.token;
        });

        it('should get transaction categories', async () => {
            const res = await request(BASE_URL)
                .get('/api/transactions/categories')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should create a transaction', async () => {
            const transactionData = {
                type: 'credit',
                amount: 500,
                description: 'Test deposit',
                category: 'deposit'
            };

            const res = await request(BASE_URL)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${userToken}`)
                .send(transactionData)
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('amount', 500);
            testTransaction = res.body.data;
        });

        it('should get transactions', async () => {
            const res = await request(BASE_URL)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should get transaction by id', async () => {
            const res = await request(BASE_URL)
                .get(`/api/transactions/${testTransaction._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe(testTransaction._id);
        });

        it('should update transaction', async () => {
            const updateData = {
                description: 'Updated test deposit'
            };

            const res = await request(BASE_URL)
                .put(`/api/transactions/${testTransaction._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.description).toBe('Updated test deposit');
        });

        it('should transfer money', async () => {
            // Create another user for transfer
            const timestamp = Date.now();
            const recipientData = {
                name: 'Recipient User',
                email: `recipient${timestamp}@example.com`,
                phone: `98765432${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
                password: 'Test@123'
            };

            const regRes = await request(BASE_URL)
                .post('/api/auth/register')
                .send(recipientData);

            const recipient = regRes.body.data.user;

            const transferData = {
                recipientAccount: recipient.accountNumber,
                amount: 100,
                description: 'Test transfer'
            };

            const res = await request(BASE_URL)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${userToken}`)
                .send(transferData)
                .expect(201);

            expect(res.body.success).toBe(true);
        });

        it('should delete transaction', async () => {
            // Get transactions first
            const getRes = await request(BASE_URL)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${userToken}`);

            const transactions = getRes.body.data;
            const transactionToDelete = transactions.find(t => t.description === 'Test deposit');

            if (transactionToDelete) {
                const res = await request(BASE_URL)
                    .delete(`/api/transactions/${transactionToDelete._id}`)
                    .set('Authorization', `Bearer ${userToken}`)
                    .expect(200);

                expect(res.body.success).toBe(true);
            }
        });
    });

    describe('User Routes', () => {
        it('should get users (as regular user - should fail)', async () => {
            const res = await request(BASE_URL)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('should get current user profile', async () => {
            const res = await request(BASE_URL)
                .get(`/api/users/${testUser._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe(testUser._id);
        });

        it('should update current user', async () => {
            const updateData = {
                name: 'Final Test User'
            };

            const res = await request(BASE_URL)
                .put(`/api/users/${testUser._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Final Test User');
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 for invalid routes', async () => {
            const res = await request(BASE_URL)
                .get('/api/invalid-route')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Route /api/invalid-route not found');
        });

        it('should handle invalid ObjectId', async () => {
            const res = await request(BASE_URL)
                .get('/api/transactions/invalid-id')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Password Management', () => {
        it('should handle password update', async () => {
            const updateData = {
                currentPassword: 'Test@123',
                newPassword: 'NewTest@123'
            };

            const res = await request(BASE_URL)
                .put('/api/auth/updatepassword')
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
        });
    });
});
