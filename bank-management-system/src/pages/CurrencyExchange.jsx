import { ArrowRightLeft, DollarSign, Euro, PoundSterling, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const CurrencyExchange = () => {
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [useLiveData, setUseLiveData] = useState(false);

    const [conversion, setConversion] = useState({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 1
    });

    const [result, setResult] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Popular currencies for quick selection
    const popularCurrencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
        { code: 'EUR', name: 'Euro', symbol: '€', icon: Euro },
        { code: 'GBP', name: 'British Pound', symbol: '£', icon: PoundSterling },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', icon: null },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: null },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', icon: null },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', icon: null },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', icon: null },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', icon: null },
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', icon: null }
    ];

    const fetchExchangeRates = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError('');

            // Check cache first (valid for 1 hour)
            const cacheKey = `exchange_rates_${useLiveData ? 'live' : 'stable'}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

            if (cachedData && cacheTimestamp && !isRefresh) {
                const cacheAge = Date.now() - parseInt(cacheTimestamp);
                const cacheValidTime = useLiveData ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min for live, 1 hour for stable

                if (cacheAge < cacheValidTime) {
                    const parsedData = JSON.parse(cachedData);
                    setExchangeRates(parsedData.rates);
                    setLastUpdated(new Date(parsedData.timestamp));
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
            }

            let rates;

            if (useLiveData) {
                // Fetch live data from API
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data && data.rates) {
                    rates = data.rates;
                } else {
                    throw new Error('Invalid API response structure');
                }
            } else {
                // Use stable mock data for consistent results
                rates = {
                    USD: 1,
                    EUR: 0.85,
                    GBP: 0.73,
                    JPY: 110.0,
                    CAD: 1.25,
                    AUD: 1.35,
                    CHF: 0.92,
                    CNY: 6.45,
                    INR: 74.5,
                    BRL: 5.2
                };
            }

            // Cache the data
            const cacheData = {
                rates,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

            setExchangeRates(rates);
            setLastUpdated(new Date());
            setError('');

        } catch (err) {
            console.error('Exchange rate fetch error:', err);

            let errorMessage = err.message;
            if (err.name === 'AbortError') {
                errorMessage = 'Request timed out. Please check your internet connection.';
            }

            // Only show error if it's not a refresh and we don't have existing data
            if (!isRefresh) {
                setError(`Failed to load exchange rates: ${errorMessage}`);
            }

            // Fallback to mock data only if we don't have any existing rates
            if (!isRefresh) {
                const fallbackRates = {
                    USD: 1,
                    EUR: 0.85,
                    GBP: 0.73,
                    JPY: 110.0,
                    CAD: 1.25,
                    AUD: 1.35,
                    CHF: 0.92,
                    CNY: 6.45,
                    INR: 74.5,
                    BRL: 5.2
                };
                setExchangeRates(fallbackRates);
                setLastUpdated(new Date());
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [useLiveData]);

    useEffect(() => {
        fetchExchangeRates();
    }, [fetchExchangeRates]);

    useEffect(() => {
        // Perform conversion when exchange rates or conversion parameters change
        if (Object.keys(exchangeRates).length > 0 &&
            exchangeRates[conversion.fromCurrency] &&
            exchangeRates[conversion.toCurrency]) {

            const amount = parseFloat(conversion.amount) || 0;
            const amountInUSD = amount / exchangeRates[conversion.fromCurrency];
            const convertedAmount = amountInUSD * exchangeRates[conversion.toCurrency];
            const rate = exchangeRates[conversion.toCurrency] / exchangeRates[conversion.fromCurrency];

            setResult({
                originalAmount: amount,
                convertedAmount: convertedAmount,
                rate: rate,
                fromCurrency: conversion.fromCurrency,
                toCurrency: conversion.toCurrency
            });
        }
    }, [exchangeRates, conversion.fromCurrency, conversion.toCurrency, conversion.amount]);

    const swapCurrencies = () => {
        setConversion({
            ...conversion,
            fromCurrency: conversion.toCurrency,
            toCurrency: conversion.fromCurrency
        });
    };

    const formatCurrency = (amount, currencyCode) => {
        const currency = popularCurrencies.find(c => c.code === currencyCode);
        const symbol = currency ? currency.symbol : currencyCode;

        // Format the number without currency first
        const formattedNumber = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(amount);

        // Handle different symbol positions and spacing based on currency
        switch (currencyCode) {
            case 'JPY':
            case 'CNY':
                // For yen and yuan, symbol comes before with no space
                return `${symbol}${formattedNumber}`;
            case 'EUR':
                // Euro symbol comes after with space
                return `${formattedNumber} ${symbol}`;
            case 'GBP':
                // Pound symbol comes before with no space
                return `${symbol}${formattedNumber}`;
            case 'CHF':
                // Swiss franc comes after with space
                return `${formattedNumber} ${symbol}`;
            case 'CAD':
            case 'AUD':
                // Canadian and Australian dollars come before with no space
                return `${symbol}${formattedNumber}`;
            case 'INR':
                // Indian rupee comes before with no space
                return `${symbol}${formattedNumber}`;
            case 'BRL':
                // Brazilian real comes before with space
                return `${symbol} ${formattedNumber}`;
            case 'USD':
            default:
                // US dollar comes before with no space (default)
                return `${symbol}${formattedNumber}`;
        }
    };

    const getCurrencyInfo = (code) => {
        return popularCurrencies.find(c => c.code === code) || { name: code, symbol: code };
    };

    if (loading) {
        return (
            <div className="container">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                    fontSize: '1.2rem',
                    color: '#667eea'
                }}>
                    Loading exchange rates...
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Currency Exchange
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Convert between currencies using {useLiveData ? 'real-time' : 'stable'} exchange rates
                    {useLiveData && ' (rates may fluctuate)'}
                </p>
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '2rem' }}>
                    {error}
                </div>
            )}

            {/* Exchange Rate Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '2rem' }}>
                {popularCurrencies.slice(0, 6).map(currency => (
                    <div key={currency.code} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div className="stat-value">
                                    {exchangeRates[currency.code] ? (1 / exchangeRates[currency.code]).toFixed(4) : 'N/A'}
                                </div>
                                <div className="stat-label">
                                    {getCurrencyInfo(currency.code).symbol}/USD
                                </div>
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: 'var(--text-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--border)'
                            }}>
                                {currency.symbol}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Currency Converter */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Currency Converter</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {useLiveData ? 'Live Data' : 'Stable Data'}
                            </label>
                            <button
                                onClick={() => {
                                    // Clear cache when switching modes
                                    localStorage.removeItem('exchange_rates_live');
                                    localStorage.removeItem('exchange_rates_live_timestamp');
                                    localStorage.removeItem('exchange_rates_stable');
                                    localStorage.removeItem('exchange_rates_stable_timestamp');
                                    setUseLiveData(!useLiveData);
                                }}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid var(--border)',
                                    background: useLiveData ? 'var(--text-accent)' : 'var(--bg-secondary)',
                                    color: useLiveData ? 'white' : 'var(--text-primary)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.3s ease'
                                }}
                                title={useLiveData ? 'Switch to stable data' : 'Switch to live data'}
                            >
                                {useLiveData ? '🔴' : '🟢'}
                            </button>
                        </div>
                        <button
                            onClick={() => fetchExchangeRates(true)}
                            className="btn btn-secondary"
                            disabled={refreshing}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={16} className={refreshing ? 'rotating' : ''} />
                            {refreshing ? 'Refreshing...' : 'Refresh Rates'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    {/* From Currency */}
                    <div style={{ flex: 1 }}>
                        <label className="form-label">From</label>
                        <select
                            className="form-input"
                            value={conversion.fromCurrency}
                            onChange={(e) => setConversion({ ...conversion, fromCurrency: e.target.value })}
                        >
                            {Object.keys(exchangeRates).sort().map(code => (
                                <option key={code} value={code}>
                                    {code} - {getCurrencyInfo(code).name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Swap Button */}
                    <button
                        onClick={swapCurrencies}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-primary)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            marginTop: '1.5rem'
                        }}
                        title="Swap currencies"
                    >
                        <ArrowRightLeft size={20} />
                    </button>

                    {/* To Currency */}
                    <div style={{ flex: 1 }}>
                        <label className="form-label">To</label>
                        <select
                            className="form-input"
                            value={conversion.toCurrency}
                            onChange={(e) => setConversion({ ...conversion, toCurrency: e.target.value })}
                        >
                            {Object.keys(exchangeRates).sort().map(code => (
                                <option key={code} value={code}>
                                    {code} - {getCurrencyInfo(code).name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Amount Input */}
                <div style={{ marginBottom: '2rem' }}>
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        className="form-input"
                        value={conversion.amount}
                        onChange={(e) => setConversion({ ...conversion, amount: e.target.value })}
                        min="0"
                        step="0.01"
                        placeholder="Enter amount"
                    />
                </div>

                {/* Conversion Result */}
                {result && (
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <TrendingUp size={20} style={{ color: '#28a745' }} />
                            <h4 style={{ margin: 0 }}>Conversion Result</h4>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>From</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                                    {formatCurrency(result.originalAmount, result.fromCurrency)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>To</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#28a745' }}>
                                    {formatCurrency(result.convertedAmount, result.toCurrency)}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Exchange Rate: 1 {getCurrencyInfo(result.fromCurrency).symbol} = {result.rate.toFixed(4)} {getCurrencyInfo(result.toCurrency).symbol}
                        </div>
                    </div>
                )}
            </div>

            {/* Popular Currency Pairs */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Popular Currency Pairs</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    {[
                        { from: 'USD', to: 'EUR' },
                        { from: 'USD', to: 'GBP' },
                        { from: 'EUR', to: 'GBP' },
                        { from: 'USD', to: 'JPY' },
                        { from: 'USD', to: 'CAD' },
                        { from: 'EUR', to: 'CHF' }
                    ].map(pair => {
                        const rate = exchangeRates[pair.to] / exchangeRates[pair.from];
                        return (
                            <div key={`${pair.from}-${pair.to}`} style={{
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                background: 'var(--bg-tertiary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: '500' }}>
                                        {pair.from}/{pair.to}
                                    </span>
                                    <span style={{ color: '#28a745', fontWeight: '600' }}>
                                        {rate ? rate.toFixed(4) : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    1 {getCurrencyInfo(pair.from).symbol} = {rate ? rate.toFixed(4) : 'N/A'} {getCurrencyInfo(pair.to).symbol}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                        📊 Data Source: {useLiveData ? 'Live Exchange Rates API' : 'Stable Reference Rates'}
                    </div>
                    <div>
                        Last updated: {lastUpdated.toLocaleString()}
                        {!useLiveData && ' (Stable rates for consistent results)'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencyExchange;
