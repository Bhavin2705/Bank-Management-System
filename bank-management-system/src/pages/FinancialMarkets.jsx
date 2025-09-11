import { Activity, BarChart3, DollarSign, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const FinancialMarkets = () => {
    const [marketData, setMarketData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // Major stock indices and commodities
    const marketSymbols = [
        { symbol: 'SPY', name: 'S&P 500', type: 'index' },
        { symbol: 'QQQ', name: 'Nasdaq 100', type: 'index' },
        { symbol: 'IWM', name: 'Russell 2000', type: 'index' },
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
        { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' }
    ];

    const fetchMarketData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Note: Open-Meteo Finance API might have different endpoints
            // For demo purposes, we'll use mock data that simulates real market data
            // In a real implementation, you would use the actual Open-Meteo Finance API

            const mockData = {};
            marketSymbols.forEach(symbol => {
                const basePrice = symbol.type === 'index' ?
                    (symbol.symbol === 'SPY' ? 450 : symbol.symbol === 'QQQ' ? 380 : 180) :
                    (symbol.symbol === 'AAPL' ? 180 : symbol.symbol === 'MSFT' ? 380 :
                        symbol.symbol === 'GOOGL' ? 140 : symbol.symbol === 'AMZN' ? 150 :
                            symbol.symbol === 'TSLA' ? 220 : symbol.symbol === 'NVDA' ? 450 : 100);

                const change = (Math.random() - 0.5) * 10; // Random change between -5 and +5
                const changePercent = (change / basePrice) * 100;

                mockData[symbol.symbol] = {
                    name: symbol.name,
                    price: basePrice + change,
                    change: change,
                    changePercent: changePercent,
                    volume: Math.floor(Math.random() * 10000000) + 1000000,
                    type: symbol.type,
                    lastUpdated: new Date()
                };
            });

            setMarketData(mockData);
            setLastUpdated(new Date());

            // Uncomment below for real API integration when available
            /*
            const symbols = marketSymbols.map(s => s.symbol).join(',');
            const response = await fetch(`https://api.open-meteo.com/v1/finance?symbols=${symbols}&interval=1d`);
      
            if (!response.ok) {
              throw new Error('Failed to fetch market data');
            }
      
            const data = await response.json();
            // Process the real API data here
            */

        } catch (err) {
            console.error('Market data fetch error:', err);
            setError('Failed to load market data. Using demo data.');

            // Set demo data as fallback
            const demoData = {};
            marketSymbols.forEach(symbol => {
                demoData[symbol.symbol] = {
                    name: symbol.name,
                    price: 100 + Math.random() * 200,
                    change: (Math.random() - 0.5) * 20,
                    changePercent: (Math.random() - 0.5) * 10,
                    volume: Math.floor(Math.random() * 10000000),
                    type: symbol.type,
                    lastUpdated: new Date()
                };
            });
            setMarketData(demoData);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketData();
        // Refresh data every 5 minutes
        const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchMarketData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatVolume = (volume) => {
        if (volume >= 1000000) {
            return (volume / 1000000).toFixed(1) + 'M';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    };

    const getChangeColor = (change) => {
        return change >= 0 ? '#28a745' : '#dc3545';
    };

    const getChangeIcon = (change) => {
        return change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
    };

    const calculateMarketSummary = () => {
        const stocks = Object.values(marketData).filter(item => item.type === 'stock');
        const indices = Object.values(marketData).filter(item => item.type === 'index');

        const avgStockChange = stocks.length > 0 ?
            stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length : 0;

        const avgIndexChange = indices.length > 0 ?
            indices.reduce((sum, index) => sum + index.changePercent, 0) / indices.length : 0;

        return { avgStockChange, avgIndexChange };
    };

    if (loading && Object.keys(marketData).length === 0) {
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
                    Loading market data...
                </div>
            </div>
        );
    }

    const summary = calculateMarketSummary();

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Financial Markets
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Real-time market data and financial indicators
                </p>
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '2rem' }}>
                    {error}
                </div>
            )}

            {/* Market Summary Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value" style={{ color: getChangeColor(summary.avgStockChange) }}>
                                {summary.avgStockChange.toFixed(2)}%
                            </div>
                            <div className="stat-label">Avg Stock Change</div>
                        </div>
                        {getChangeIcon(summary.avgStockChange)}
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value" style={{ color: getChangeColor(summary.avgIndexChange) }}>
                                {summary.avgIndexChange.toFixed(2)}%
                            </div>
                            <div className="stat-label">Avg Index Change</div>
                        </div>
                        {getChangeIcon(summary.avgIndexChange)}
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{Object.keys(marketData).length}</div>
                            <div className="stat-label">Symbols Tracked</div>
                        </div>
                        <BarChart3 size={32} style={{ color: '#667eea' }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">
                                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
                            </div>
                            <div className="stat-label">Last Updated</div>
                        </div>
                        <Activity size={32} style={{ color: '#28a745' }} />
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={fetchMarketData}
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* Market Indices */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} />
                    Major Indices
                </h3>

                <div className="transaction-list">
                    {Object.values(marketData)
                        .filter(item => item.type === 'index')
                        .map((index) => (
                            <div key={index.name} className="transaction-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '50%',
                                        background: 'var(--bg-tertiary)'
                                    }}>
                                        <BarChart3 size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                            {index.name}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Volume: {formatVolume(index.volume)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                        {formatCurrency(index.price)}
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        color: getChangeColor(index.change),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '0.25rem'
                                    }}>
                                        {getChangeIcon(index.change)}
                                        {index.change >= 0 ? '+' : ''}{formatCurrency(index.change)} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Top Stocks */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={20} />
                    Popular Stocks
                </h3>

                <div className="transaction-list">
                    {Object.values(marketData)
                        .filter(item => item.type === 'stock')
                        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
                        .map((stock) => (
                            <div key={stock.name} className="transaction-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '50%',
                                        background: 'var(--bg-tertiary)'
                                    }}>
                                        <TrendingUp size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                            {stock.name}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Volume: {formatVolume(stock.volume)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                        {formatCurrency(stock.price)}
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        color: getChangeColor(stock.change),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '0.25rem'
                                    }}>
                                        {getChangeIcon(stock.change)}
                                        {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Market Status */}
            <div style={{
                textAlign: 'center',
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Activity size={16} />
                    <strong>Market Status:</strong>
                </div>
                <div>
                    {summary.avgStockChange >= 0 ? '📈 Bullish' : '📉 Bearish'} •
                    Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Data refreshes automatically every 5 minutes
                </div>
            </div>
        </div>
    );
};

export default FinancialMarkets;
