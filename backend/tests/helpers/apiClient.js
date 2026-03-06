const request = require('supertest');
const path = require('path');
const fs = require('fs');

const DEFAULT_BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5055';
const STATE_FILE = path.resolve(__dirname, '..', '.jest-server-state.json');

const resolveBaseUrl = () => {
    if (process.env.TEST_BASE_URL) {
        return process.env.TEST_BASE_URL;
    }

    try {
        if (fs.existsSync(STATE_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            if (parsed && parsed.baseUrl) {
                return parsed.baseUrl;
            }
        }
    } catch (_) {
    }

    return DEFAULT_BASE_URL;
};

const api = () => request(resolveBaseUrl());

const withAuth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
    api,
    withAuth
};
