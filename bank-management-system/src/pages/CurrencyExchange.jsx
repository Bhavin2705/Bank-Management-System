import { ArrowRightLeft, DollarSign, Euro, PoundSterling, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import clientData from '../utils/clientData';
import debounce from '../utils/debounce';

const CurrencyExchange = () => {
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [useLiveData, setUseLiveData] = useState(true);

    const [conversion, setConversion] = useState({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 1
    });

    const [result, setResult] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshDisabled, setRefreshDisabled] = useState(false);
    const MIN_REFRESH_INTERVAL = 10 * 1000;

    const popularCurrencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
        { code: 'EUR', name: 'Euro', symbol: '€', icon: Euro },
        { code: 'GBP', name: 'British Pound', symbol: '£', icon: PoundSterling },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', icon: null },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: null },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', icon: null },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', icon: null },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', icon: null },
        { code: 'INR', name: 'Indian Rupee', symbol: 'Rs', icon: null },
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

            let rates = {};
            let timestamp = null;

            if (useLiveData) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch('/api/exchange/rates', {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    throw new Error(`Upstream error: ${response.status} ${text}`);
                }

                const data = await response.json();

                if (!data || !data.rates) {
                    throw new Error('Invalid proxy response structure');
                }

                rates = data.rates;
                timestamp = Date.now();

                await clientData.setSection('exchangeCache', {
                    rates,
                    timestamp
                }).catch(() => { });
            } else {
                const cached = await clientData.getSection('exchangeCache');

                if (!cached || !cached.rates || !cached.timestamp) {
                    throw new Error('No cached exchange rates available in stable mode. Please switch to live mode and refresh first.');
                }

                rates = cached.rates;
                timestamp = cached.timestamp;
            }

            setExchangeRates(rates);
            setLastUpdated(new Date(timestamp));
            setError('');

        } catch (err) {
            console.error('Exchange rate fetch error:', err);

            let errorMessage = err.message;
            if (err.name === 'AbortError') {
                errorMessage = 'Request timed out. Please check your internet connection.';
            }

            if (!isRefresh) {
                setError(`Failed to load exchange rates: ${errorMessage}`);
            }

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [useLiveData]);

    const debouncedFetchRef = useRef(debounce((isRefresh) => fetchExchangeRates(isRefresh), 300));

    useEffect(() => {
        debouncedFetchRef.current(false);
    }, [fetchExchangeRates]);

    useEffect(() => {
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

        const formattedNumber = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(amount);

        switch (currencyCode) {
            case 'JPY':
            case 'CNY':
                return `${symbol}${formattedNumber}`;
            case 'EUR':
                return `${formattedNumber} ${symbol}`;
            case 'GBP':
                return `${symbol}${formattedNumber}`;
            case 'CHF':
                return `${formattedNumber} ${symbol}`;
            case 'CAD':
            case 'AUD':
                return `${symbol}${formattedNumber}`;
            case 'INR':
                return `${symbol}${formattedNumber}`;
            case 'BRL':
                return `${symbol} ${formattedNumber}`;
            case 'USD':
            default:
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
                                    clientData.setSection('exchangeCache', { rates: {}, timestamp: null }).catch(() => { });
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
                            onClick={() => {
                                if (refreshDisabled) return;
                                fetchExchangeRates(true);
                                setRefreshDisabled(true);
                                setTimeout(() => setRefreshDisabled(false), MIN_REFRESH_INTERVAL);
                            }}
                            className="btn btn-secondary"
                            disabled={refreshing || refreshDisabled}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={16} className={refreshing ? 'rotating' : ''} />
                            {refreshing ? 'Refreshing...' : (refreshDisabled ? 'Please wait...' : 'Refresh Rates')}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
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
                        📊 Data Source: {useLiveData ? 'Live Exchange Rates API' : 'Stable (from last live fetch)'}
                    </div>
                    <div>
                        Last updated: {lastUpdated.toLocaleString()}
                        {!useLiveData && ' (using previously fetched rates)'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencyExchange;