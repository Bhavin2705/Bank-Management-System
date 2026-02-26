import { ArrowRightLeft, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import clientData from '../utils/clientData';
import debounce from '../utils/debounce';

const popularCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
];

const popularPairs = [
    { from: 'USD', to: 'EUR' },
    { from: 'USD', to: 'GBP' },
    { from: 'EUR', to: 'GBP' },
    { from: 'USD', to: 'JPY' },
    { from: 'USD', to: 'CAD' },
    { from: 'EUR', to: 'CHF' }
];

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
        if (
            Object.keys(exchangeRates).length > 0 &&
            exchangeRates[conversion.fromCurrency] &&
            exchangeRates[conversion.toCurrency]
        ) {
            const amount = parseFloat(conversion.amount) || 0;
            const amountInUSD = amount / exchangeRates[conversion.fromCurrency];
            const convertedAmount = amountInUSD * exchangeRates[conversion.toCurrency];
            const rate = exchangeRates[conversion.toCurrency] / exchangeRates[conversion.fromCurrency];

            setResult({
                originalAmount: amount,
                convertedAmount,
                rate,
                fromCurrency: conversion.fromCurrency,
                toCurrency: conversion.toCurrency
            });
        }
    }, [exchangeRates, conversion.fromCurrency, conversion.toCurrency, conversion.amount]);

    const swapCurrencies = () => {
        setConversion((prev) => ({
            ...prev,
            fromCurrency: prev.toCurrency,
            toCurrency: prev.fromCurrency
        }));
    };

    const formatCurrency = (amount, currencyCode) => {
        const currency = popularCurrencies.find((c) => c.code === currencyCode);
        const symbol = currency ? currency.symbol : currencyCode;

        const formattedNumber = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);

        switch (currencyCode) {
            case 'EUR':
            case 'CHF':
                return `${formattedNumber} ${symbol}`;
            case 'BRL':
                return `${symbol} ${formattedNumber}`;
            default:
                return `${symbol}${formattedNumber}`;
        }
    };

    const getCurrencyInfo = (code) => {
        return popularCurrencies.find((c) => c.code === code) || { name: code, symbol: code };
    };

    if (loading) {
        return (
            <div className="container">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '50vh',
                        fontSize: '1.2rem',
                        color: 'var(--text-accent)'
                    }}
                >
                    Loading exchange rates...
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Currency Exchange</h1>
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

            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, marginBottom: '0.9rem', fontSize: '1.05rem' }}>Key Rates</h3>
            </div>
            <div
                className="dashboard-grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '2rem' }}
            >
                {popularCurrencies.slice(0, 6).map((currency) => (
                    <div key={currency.code} className="stat-card" style={{ padding: '1rem', minHeight: '92px' }}>
                        <div className="stat-label" style={{ marginBottom: '0.2rem' }}>
                            {currency.code}/USD
                        </div>
                        <div className="stat-value" style={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                            {exchangeRates[currency.code] ? (1 / exchangeRates[currency.code]).toFixed(2) : 'N/A'}
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                    }}
                >
                    <h3 style={{ margin: 0 }}>Currency Converter</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 0.6rem',
                                border: '1px solid var(--border)',
                                borderRadius: '999px',
                                background: 'var(--bg-tertiary)'
                            }}
                        >
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mode:</span>
                            <button
                                onClick={() => {
                                    clientData.setSection('exchangeCache', { rates: {}, timestamp: null }).catch(() => { });
                                    setUseLiveData(!useLiveData);
                                }}
                                style={{
                                    padding: '0.25rem 0.6rem',
                                    border: '1px solid var(--border)',
                                    background: useLiveData ? 'var(--text-accent)' : 'var(--bg-secondary)',
                                    color: useLiveData ? 'white' : 'var(--text-primary)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    transition: 'all 0.3s ease'
                                }}
                                title={useLiveData ? 'Switch to stable data' : 'Switch to live data'}
                            >
                                {useLiveData ? 'Live' : 'Stable'}
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
                            {refreshing ? 'Refreshing...' : refreshDisabled ? 'Please wait...' : 'Refresh Rates'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <label className="form-label">From</label>
                        <select
                            className="form-input"
                            value={conversion.fromCurrency}
                            onChange={(e) => setConversion({ ...conversion, fromCurrency: e.target.value })}
                        >
                            {Object.keys(exchangeRates)
                                .sort()
                                .map((code) => (
                                    <option key={code} value={code}>
                                        {code} - {getCurrencyInfo(code).name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <button
                        onClick={swapCurrencies}
                        style={{
                            padding: '0.65rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-primary)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            marginBottom: '0.15rem'
                        }}
                        title="Swap currencies"
                    >
                        <ArrowRightLeft size={20} />
                    </button>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <label className="form-label">To</label>
                        <select
                            className="form-input"
                            value={conversion.toCurrency}
                            onChange={(e) => setConversion({ ...conversion, toCurrency: e.target.value })}
                        >
                            {Object.keys(exchangeRates)
                                .sort()
                                .map((code) => (
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
                    <div
                        style={{
                            background: 'var(--bg-tertiary)',
                            padding: '1.25rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <TrendingUp size={20} style={{ color: '#28a745' }} />
                            <h4 style={{ margin: 0 }}>Conversion Result</h4>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1rem'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>From</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                                    {formatCurrency(result.originalAmount, result.fromCurrency)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>To</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#28a745' }}>
                                    {formatCurrency(result.convertedAmount, result.toCurrency)}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Exchange Rate: 1 {getCurrencyInfo(result.fromCurrency).symbol} = {result.rate.toFixed(2)}{' '}
                            {getCurrencyInfo(result.toCurrency).symbol}
                        </div>
                    </div>
                )}
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Popular Currency Pairs</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    {popularPairs.map((pair) => {
                        const rate = exchangeRates[pair.to] / exchangeRates[pair.from];
                        return (
                            <div
                                key={`${pair.from}-${pair.to}`}
                                style={{
                                    padding: '1rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    background: 'var(--bg-tertiary)'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.5rem'
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>
                                        {pair.from}/{pair.to}
                                    </span>
                                    <span style={{ color: '#28a745', fontWeight: 700 }}>{rate ? rate.toFixed(2) : 'N/A'}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    1 {getCurrencyInfo(pair.from).symbol} = {rate ? rate.toFixed(2) : 'N/A'}{' '}
                                    {getCurrencyInfo(pair.to).symbol}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {lastUpdated && (
                <div
                    style={{
                        textAlign: 'center',
                        marginTop: '2rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        padding: '1rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div style={{ marginBottom: '0.5rem' }}>
                        Data Source: {useLiveData ? 'Live Exchange Rates API' : 'Stable (from last live fetch)'}
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
