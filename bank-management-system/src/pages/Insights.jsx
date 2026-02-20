import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTransactionStats } from '../utils/transactions';

const Insights = ({ user }) => {
    const [timeFrame, setTimeFrame] = useState('30');
    const [stats, setStats] = useState({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        totalTransactions: 0,
        recentTransactions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hoveredBar, setHoveredBar] = useState(null);

    const getDatePeriods = () => {
        const now = new Date();
        const periods = [];

        if (timeFrame === '7') {
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                periods.push({
                    label: date.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                    startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
                });
            }
        } else if (timeFrame === '30') {
            for (let i = 3; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i * 7);
                const weekStart = new Date(date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const startLabel = weekStart.toLocaleString('en-US', { month: 'short', day: 'numeric' });
                const endLabel = weekEnd.toLocaleString('en-US', { month: 'short', day: 'numeric' });

                periods.push({
                    label: `${startLabel} - ${endLabel}`,
                    startDate: new Date(weekStart),
                    endDate: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000)
                });
            }
        } else {
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                periods.push({
                    label: date.toLocaleString('en-US', { month: 'short' }),
                    startDate: new Date(date.getFullYear(), date.getMonth(), 1),
                    endDate: new Date(date.getFullYear(), date.getMonth() + 1, 1)
                });
            }
        }

        return periods;
    };

    const getChartData = () => {
        const periods = getDatePeriods();
        const chartData = periods.map(p => ({
            label: p.label,
            income: 0,
            expenses: 0
        }));

        if (stats.recentTransactions?.length) {
            stats.recentTransactions.forEach(tx => {
                const txDate = new Date(tx.date);
                const periodIndex = periods.findIndex(
                    p => txDate >= p.startDate && txDate < p.endDate
                );

                if (periodIndex !== -1) {
                    if (tx.type === 'credit') {
                        chartData[periodIndex].income += Number(tx.amount) || 0;
                    } else if (tx.type === 'debit' || tx.type === 'transfer') {
                        chartData[periodIndex].expenses += Number(tx.amount) || 0;
                    }
                }
            });
        }

        return chartData;
    };

    const chartData = getChartData();

    const calculateCategorySpending = () => {
        const categories = {
            transfers: 0,
            bills: 0,
            cardPayments: 0,
            others: 0
        };

        if (stats.recentTransactions?.length) {
            stats.recentTransactions.forEach(tx => {
                if (tx.type === 'debit' || tx.type === 'transfer') {
                    const category = (tx.category || '').toLowerCase();
                    if (category.includes('transfer')) categories.transfers += Number(tx.amount) || 0;
                    else if (category.includes('bill')) categories.bills += Number(tx.amount) || 0;
                    else if (category.includes('card')) categories.cardPayments += Number(tx.amount) || 0;
                    else categories.others += Number(tx.amount) || 0;
                }
            });
        }

        return categories;
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const transactionStats = await getTransactionStats();
                setStats(transactionStats);
                setError('');
            } catch (err) {
                setError('Failed to load insights data');
                console.error('Insights error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user?._id) fetchStats();
    }, [user?._id, timeFrame]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);

    const categorySpending = calculateCategorySpending();
    const totalSpending = Object.values(categorySpending).reduce((a, b) => a + b, 0);
    const netBalance = stats.monthlyIncome - stats.monthlyExpenses;

    const IncomeExpenseChart = () => {
        const maxValue = Math.max(
            ...chartData.map(d => Math.max(d.income, d.expenses)),
            1
        );
        const chartHeight = 240;
        const barWidth = 32;
        const gapBetweenBars = 10;
        const groupWidth = barWidth * 2 + gapBetweenBars;

        return (
            <div
                style={{
                    width: '100%',
                    padding: '70px 20px 60px',
                    position: 'relative',
                    overflowX: 'auto',
                    overflowY: 'visible'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: chartData.length > 5 ? 'flex-start' : 'center',
                        gap: '28px',
                        minHeight: chartHeight + 140,
                        padding: '0 12px'
                    }}
                >
                    {chartData.map((data, idx) => {
                        const incomeHeight = (data.income / maxValue) * chartHeight;
                        const expenseHeight = (data.expenses / maxValue) * chartHeight;
                        const tallestHeight = Math.max(incomeHeight, expenseHeight);
                        const isHovered = hoveredBar === idx;

                        // Gap so tooltip sits nicely above the bar without touching it
                        const tooltipOffset = tallestHeight + 45;

                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: groupWidth + 32,
                                    padding: '0 10px',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={() => setHoveredBar(idx)}
                                onMouseLeave={() => setHoveredBar(null)}
                            >
                                {isHovered && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: tooltipOffset,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'rgba(17, 24, 39, 0.96)',
                                            color: 'white',
                                            padding: '10px 14px',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            zIndex: 30,
                                            boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            pointerEvents: 'none',
                                            minWidth: '170px'
                                        }}
                                    >
                                        {/* Upward arrow pointing to the bar */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: -8,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 0,
                                                height: 0,
                                                borderLeft: '8px solid transparent',
                                                borderRight: '8px solid transparent',
                                                borderTop: '8px solid rgba(17, 24, 39, 0.96)',
                                            }}
                                        />

                                        <div
                                            style={{
                                                fontWeight: 600,
                                                marginBottom: '8px',
                                                fontSize: '1.02rem',
                                                borderBottom: '1px solid rgba(255,255,255,0.12)',
                                                paddingBottom: '6px'
                                            }}
                                        >
                                            {data.label}
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                color: '#86efac',
                                                margin: '5px 0'
                                            }}
                                        >
                                            <span>Income</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(data.income)}</span>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                color: '#fca5a5',
                                                margin: '5px 0'
                                            }}
                                        >
                                            <span>Expenses</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(data.expenses)}</span>
                                        </div>
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        gap: gapBetweenBars,
                                        height: chartHeight,
                                        width: groupWidth,
                                        justifyContent: 'center'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: barWidth,
                                            height: Math.max(incomeHeight, 3),
                                            background: 'linear-gradient(to top, #6366f1, #8b5cf6)',
                                            borderRadius: '5px 5px 0 0',
                                            transition: 'all 0.18s ease',
                                            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                                            opacity: isHovered ? 1 : 0.9
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: barWidth,
                                            height: Math.max(expenseHeight, 3),
                                            background: '#ef4444',
                                            borderRadius: '5px 5px 0 0',
                                            transition: 'all 0.18s ease',
                                            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                                            opacity: isHovered ? 1 : 0.9
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        marginTop: '14px',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 500,
                                        textAlign: 'center',
                                        lineHeight: 1.25
                                    }}
                                >
                                    {data.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {chartData.every(d => d.income === 0 && d.expenses === 0) && (
                    <div
                        style={{
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            padding: '3rem 1rem',
                            fontStyle: 'italic'
                        }}
                    >
                        No transactions in this period
                    </div>
                )}
            </div>
        );
    };

    const SpendingDonutChart = () => {
        const total = totalSpending || 1;
        const categories = [
            { name: 'Transfers', value: categorySpending.transfers, color: '#667eea' },
            { name: 'Bills', value: categorySpending.bills, color: '#764ba2' },
            { name: 'Card Payments', value: categorySpending.cardPayments, color: '#ffc107' },
            { name: 'Others', value: categorySpending.others, color: '#6c757d' }
        ];

        const radius = 60;
        const centerX = 100;
        const centerY = 100;
        let currentAngle = -Math.PI / 2;

        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: 200 }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {categories.map((cat, idx) => {
                        const sliceAngle = (cat.value / total) * 2 * Math.PI;
                        const x1 = centerX + radius * Math.cos(currentAngle);
                        const y1 = centerY + radius * Math.sin(currentAngle);
                        const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle);
                        const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle);

                        const largeArc = sliceAngle > Math.PI ? 1 : 0;
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        currentAngle += sliceAngle;

                        return <path key={idx} d={pathData} fill={cat.color} stroke="white" strokeWidth="2" />;
                    })}
                    <circle cx={centerX} cy={centerY} r="35" fill="white" />
                    <text
                        x={centerX}
                        y={centerY - 5}
                        textAnchor="middle"
                        style={{ fontSize: '12px', fontWeight: 'bold', fill: 'var(--text-primary)' }}
                    >
                        {formatCurrency(totalSpending)}
                    </text>
                    <text
                        x={centerX}
                        y={centerY + 12}
                        textAnchor="middle"
                        style={{ fontSize: '10px', fill: 'var(--text-secondary)' }}
                    >
                        Total Spent
                    </text>
                </svg>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="container">
                <div style={{ textAlign: 'center', padding: '4rem' }}>Loading insights...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Insights</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Overview of your financial activity</p>
                </div>
                <select
                    value={timeFrame}
                    onChange={e => setTimeFrame(e.target.value)}
                    style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        minWidth: '160px'
                    }}
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="180">Last 6 Months</option>
                </select>
            </div>

            {error && (
                <div
                    style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        color: '#dc3545',
                        padding: '1rem 1.25rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(220, 53, 69, 0.3)'
                    }}
                >
                    {error}
                </div>
            )}

            <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{formatCurrency(stats.monthlyIncome)}</div>
                            <div className="stat-label">Total Income</div>
                        </div>
                        <TrendingUp size={32} style={{ color: '#28a745' }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{formatCurrency(stats.monthlyExpenses)}</div>
                            <div className="stat-label">Total Expenses</div>
                        </div>
                        <TrendingDown size={32} style={{ color: '#dc3545' }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value" style={{ color: netBalance >= 0 ? '#28a745' : '#dc3545' }}>
                                {formatCurrency(netBalance)}
                            </div>
                            <div className="stat-label">Net Balance</div>
                        </div>
                        <div style={{ fontSize: '32px' }}>💰</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{stats.totalTransactions}</div>
                            <div className="stat-label">Total Transactions</div>
                        </div>
                        <Activity size={32} style={{ color: '#667eea' }} />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <TrendingUp size={20} style={{ color: '#667eea' }} />
                    Income vs Expenses ({timeFrame === '7' ? 'Last 7 Days' : timeFrame === '30' ? 'Last 30 Days' : 'Last 6 Months'})
                </h3>

                <IncomeExpenseChart />

                <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', marginTop: '1.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '3px' }} />
                        <span style={{ fontSize: '0.95rem' }}>Income</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '14px', height: '14px', background: '#dc3545', borderRadius: '3px' }} />
                        <span style={{ fontSize: '0.95rem' }}>Expenses</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <TrendingDown size={20} style={{ color: '#dc3545' }} />
                        Spending by Category
                    </h3>
                    <SpendingDonutChart />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
                        {[
                            { name: 'Transfers', color: '#667eea', value: categorySpending.transfers },
                            { name: 'Bills', color: '#764ba2', value: categorySpending.bills },
                            { name: 'Card Payments', color: '#ffc107', value: categorySpending.cardPayments },
                            { name: 'Others', color: '#6c757d', value: categorySpending.others }
                        ].map(cat => (
                            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                                <div style={{ width: '10px', height: '10px', background: cat.color, borderRadius: '3px' }} />
                                <span>{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Top Spending Categories</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {[
                            { category: 'Transfers', amount: categorySpending.transfers },
                            { category: 'Bills', amount: categorySpending.bills },
                            { category: 'Card Payments', amount: categorySpending.cardPayments },
                            { category: 'Others', amount: categorySpending.others }
                        ]
                            .filter(item => item.amount > 0)
                            .sort((a, b) => b.amount - a.amount)
                            .map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingBottom: '1rem',
                                        borderBottom: idx < 3 ? '1px solid var(--border)' : 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '0.98rem' }}>{item.category}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {formatCurrency(item.amount)}
                                    </span>
                                </div>
                            ))}

                        {totalSpending === 0 && (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                                No spending recorded yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Insights;