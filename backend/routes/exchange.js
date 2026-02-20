const express = require('express');
const axios = require('axios');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

let cachedRates = null;
let cachedAt = 0;
const CACHE_TTL_MS = parseInt(process.env.EXCHANGE_CACHE_TTL_MS) || 60000;

let lastLiveRates = null;

const EXCHANGE_API_URL = `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API_KEY}`;

router.get('/rates', apiLimiter, async (req, res) => {
    try {
        const now = Date.now();
        if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
            return res.json({
                success: true,
                source: 'cache',
                timestamp: cachedAt,
                rates: cachedRates
            });
        }

        const response = await axios.get(EXCHANGE_API_URL, { timeout: 10000 });

        const data = response.data;
        if (!data || !data.rates) {
            throw new Error('Invalid upstream response');
        }

        cachedRates = data.rates;
        cachedAt = Date.now();
        lastLiveRates = cachedRates;

        return res.json({
            success: true,
            source: 'upstream',
            timestamp: cachedAt,
            rates: cachedRates
        });
    } catch (err) {
        if (lastLiveRates) {
            return res.json({
                success: true,
                source: 'last-live',
                timestamp: cachedAt,
                rates: lastLiveRates
            });
        }

        return res.status(502).json({
            success: false,
            error: 'Failed to fetch exchange rates'
        });
    }
});

module.exports = router;
