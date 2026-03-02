const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

const api = () => request(BASE_URL);

const withAuth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
    api,
    withAuth
};
