const express = require('express');
const axios = require('axios');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

let cachedRates = null;
let cachedAt = 0;
const CACHE_TTL_MS = parseInt(process.env.EXCHANGE_CACHE_TTL_MS) || 60000;

let lastLiveRates = null;

const EXCHANGE_API_URL = `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API_KEY}`;

const fetchRates = async () => {
    const now = Date.now();
    if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
        return { success: true, source: 'cache', timestamp: cachedAt, rates: cachedRates };
    }

    try {
        const response = await axios.get(EXCHANGE_API_URL, { timeout: 10000 });
        const data = response.data;

        if (!data || !data.rates) {
            throw new Error('Invalid upstream response');
        }

        cachedRates = data.rates;
        cachedAt = Date.now();
        lastLiveRates = cachedRates;
        return { success: true, source: 'upstream', timestamp: cachedAt, rates: cachedRates };
    } catch (err) {
        if (lastLiveRates) {
            return { success: true, source: 'last-live', timestamp: cachedAt, rates: lastLiveRates };
        }
        return { success: false, error: 'Failed to fetch exchange rates' };
    }
};

router.get('/rates', apiLimiter, async (req, res) => {
    const result = await fetchRates();
    if (!result.success) {
        return res.status(502).json({
            success: false,
            error: result.error
        });
    }

    return res.json(result);
});

router.post('/convert', apiLimiter, async (req, res) => {
    const { amount, from, to } = req.body || {};
    const numericAmount = Number(amount);
    const fromCurrency = typeof from === 'string' ? from.toUpperCase() : '';
    const toCurrency = typeof to === 'string' ? to.toUpperCase() : '';

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!fromCurrency || !toCurrency) {
        return res.status(400).json({ success: false, error: 'Both source and target currency are required' });
    }

    if (fromCurrency === toCurrency) {
        return res.status(200).json({
            success: true,
            data: {
                amount: numericAmount,
                from: fromCurrency,
                to: toCurrency,
                convertedAmount: numericAmount,
                rate: 1
            }
        });
    }

    const result = await fetchRates();
    if (!result.success) {
        return res.status(502).json({ success: false, error: result.error });
    }

    const fromRate = result.rates[fromCurrency];
    const toRate = result.rates[toCurrency];
    if (!fromRate || !toRate) {
        return res.status(400).json({ success: false, error: 'Unsupported currency code' });
    }

    const amountInUsd = numericAmount / fromRate;
    const convertedAmount = amountInUsd * toRate;
    const rate = toRate / fromRate;

    return res.status(200).json({
        success: true,
        source: result.source,
        timestamp: result.timestamp,
        data: {
            amount: numericAmount,
            from: fromCurrency,
            to: toCurrency,
            convertedAmount,
            rate
        }
    });
});

module.exports = router;
