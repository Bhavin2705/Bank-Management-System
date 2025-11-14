const express = require('express');
const axios = require('axios');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Simple in-memory cache
let cachedRates = null;
let cachedAt = 0;
const CACHE_TTL_MS = parseInt(process.env.EXCHANGE_CACHE_TTL_MS) || 60 * 1000; // default 60s

router.get('/rates', apiLimiter, async (req, res) => {
    try {
        const now = Date.now();
        if (cachedRates && (now - cachedAt) < CACHE_TTL_MS) {
            return res.json({ success: true, source: 'cache', timestamp: cachedAt, rates: cachedRates });
        }

        // Fetch from upstream API
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
            signal: controller.signal,
            timeout: 10000
        });
        clearTimeout(timeout);

        const data = response.data;
        if (!data || !data.rates) {
            throw new Error('Invalid upstream response');
        }

        cachedRates = data.rates;
        cachedAt = Date.now();

        return res.json({ success: true, source: 'upstream', timestamp: cachedAt, rates: cachedRates });
    } catch (err) {
        // On error, return cached data if available
        if (cachedRates) {
            return res.json({ success: true, source: 'cache-fallback', timestamp: cachedAt, rates: cachedRates, warning: err.message });
        }
        console.error('Exchange proxy error:', err.message || err);
        return res.status(502).json({ success: false, error: 'Failed to fetch exchange rates', details: err.message });
    }
});

module.exports = router;
