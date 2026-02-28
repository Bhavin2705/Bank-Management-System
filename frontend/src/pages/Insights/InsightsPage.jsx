import { Activity, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyByPreference } from '../../utils/currency';
import { getTransactionStats } from '../../utils/transactions';

const TIMEFRAME_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '180', label: 'Last 6 Months' }
];

const getDatePeriods = (timeFrame) => {
  const now = new Date();
  const periods = [];

  if (timeFrame === '7') {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      periods.push({
        label: date.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      });
    }
    return periods;
  }

  if (timeFrame === '30') {
    for (let i = 3; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      periods.push({
        label: `${weekStart.toLocaleString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`,
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000)
      });
    }
    return periods;
  }

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      label: date.toLocaleString('en-US', { month: 'short' }),
      startDate: new Date(date.getFullYear(), date.getMonth(), 1),
      endDate: new Date(date.getFullYear(), date.getMonth() + 1, 1)
    });
  }

  return periods;
};

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const transactionStats = await getTransactionStats();
        setStats(transactionStats);
        setError('');
      } catch (fetchError) {
        setError('Failed to load insights data');
        console.error('Insights error:', fetchError);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) fetchStats();
  }, [user?._id]);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user, { minimumFractionDigits: 0 });

  const chartData = useMemo(() => {
    const periods = getDatePeriods(timeFrame);
    const data = periods.map((period) => ({
      label: period.label,
      income: 0,
      expenses: 0
    }));

    if (!stats.recentTransactions?.length) return data;

    stats.recentTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.date || transaction.createdAt || transaction.timestamp);
      const periodIndex = periods.findIndex(
        (period) => transactionDate >= period.startDate && transactionDate < period.endDate
      );

      if (periodIndex === -1) return;

      if (transaction.type === 'credit') {
        data[periodIndex].income += Number(transaction.amount) || 0;
      } else if (transaction.type === 'debit' || transaction.type === 'transfer') {
        data[periodIndex].expenses += Number(transaction.amount) || 0;
      }
    });

    return data;
  }, [stats.recentTransactions, timeFrame]);

  const categorySpending = useMemo(() => {
    const categories = {
      transfers: 0,
      bills: 0,
      cardPayments: 0,
      others: 0
    };

    if (!stats.recentTransactions?.length) return categories;

    stats.recentTransactions.forEach((transaction) => {
      if (transaction.type !== 'debit' && transaction.type !== 'transfer') return;
      const category = (transaction.category || '').toLowerCase();
      if (category.includes('transfer')) categories.transfers += Number(transaction.amount) || 0;
      else if (category.includes('bill')) categories.bills += Number(transaction.amount) || 0;
      else if (category.includes('card')) categories.cardPayments += Number(transaction.amount) || 0;
      else categories.others += Number(transaction.amount) || 0;
    });

    return categories;
  }, [stats.recentTransactions]);

  const totalSpending = useMemo(
    () => Object.values(categorySpending).reduce((sum, value) => sum + value, 0),
    [categorySpending]
  );

  const topCategories = useMemo(
    () => [
      { category: 'Transfers', amount: categorySpending.transfers },
      { category: 'Bills', amount: categorySpending.bills },
      { category: 'Card Payments', amount: categorySpending.cardPayments },
      { category: 'Others', amount: categorySpending.others }
    ]
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    [categorySpending]
  );

  const netBalance = stats.monthlyIncome - stats.monthlyExpenses;
  const selectedTimeLabel = TIMEFRAME_OPTIONS.find((option) => option.value === timeFrame)?.label || 'Last 30 Days';

  const IncomeExpenseChart = () => {
    const maxValue = Math.max(...chartData.map((item) => Math.max(item.income, item.expenses)), 1);
    const hasData = chartData.some((item) => item.income > 0 || item.expenses > 0);
    const chartHeight = 230;

    if (!hasData) {
      return <div className="insights-empty-chart">No transactions in this period</div>;
    }

    return (
      <div className="insights-chart-scroll">
        <div className="insights-chart-grid">
          {chartData.map((item) => {
            const incomeHeight = (item.income / maxValue) * chartHeight;
            const expenseHeight = (item.expenses / maxValue) * chartHeight;

            return (
              <div key={item.label} className="insights-chart-group">
                <div className="insights-bars">
                  <div
                    className="insights-bar insights-bar-income"
                    style={{ height: `${item.income > 0 ? Math.max(incomeHeight, 6) : 0}px` }}
                  />
                  <div
                    className="insights-bar insights-bar-expense"
                    style={{ height: `${item.expenses > 0 ? Math.max(expenseHeight, 6) : 0}px` }}
                  />
                </div>
                <div className="insights-chart-label">{item.label}</div>
                <div className="insights-chart-values">
                  <span>{formatCurrency(item.income)}</span>
                  <span>{formatCurrency(item.expenses)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const SpendingDonutChart = () => {
    const categories = [
      { name: 'Transfers', value: categorySpending.transfers, color: '#3b82f6' },
      { name: 'Bills', value: categorySpending.bills, color: '#8b5cf6' },
      { name: 'Card Payments', value: categorySpending.cardPayments, color: '#f59e0b' },
      { name: 'Others', value: categorySpending.others, color: '#64748b' }
    ];

    const total = totalSpending || 1;
    const radius = 60;
    const centerX = 100;
    const centerY = 100;
    let currentAngle = -Math.PI / 2;

    return (
      <div className="insights-donut-wrap">
        <svg width="200" height="200" viewBox="0 0 200 200" aria-label="Spending by category">
          {categories.map((category) => {
            const sliceAngle = (category.value / total) * 2 * Math.PI;
            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle);
            const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle);
            const largeArc = sliceAngle > Math.PI ? 1 : 0;
            const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            currentAngle += sliceAngle;
            return <path key={category.name} d={pathData} fill={category.color} stroke="white" strokeWidth="2" />;
          })}
          <circle cx={centerX} cy={centerY} r="35" fill="var(--bg-secondary)" />
          <text x={centerX} y={centerY - 5} textAnchor="middle" className="insights-donut-total">
            {formatCurrency(totalSpending)}
          </text>
          <text x={centerX} y={centerY + 12} textAnchor="middle" className="insights-donut-subtitle">
            Total Spent
          </text>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container insights-page">
        <div className="insights-loading">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="container insights-page">
      <div className="insights-header">
        <div>
          <h1 className="insights-title">Insights</h1>
          <p className="insights-subtitle">Overview of your financial activity</p>
        </div>
        <select className="insights-timeframe" value={timeFrame} onChange={(event) => setTimeFrame(event.target.value)}>
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="insights-error">{error}</div>}

      <div className="dashboard-grid insights-stats-grid">
        <div className="stat-card">
          <div className="insights-stat">
            <div>
              <div className="stat-value">{formatCurrency(stats.monthlyIncome)}</div>
              <div className="stat-label">Total Income</div>
            </div>
            <TrendingUp size={30} style={{ color: '#16a34a' }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="insights-stat">
            <div>
              <div className="stat-value">{formatCurrency(stats.monthlyExpenses)}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <TrendingDown size={30} style={{ color: '#dc2626' }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="insights-stat">
            <div>
              <div className="stat-value" style={{ color: netBalance >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(netBalance)}</div>
              <div className="stat-label">Net Balance</div>
            </div>
            <DollarSign size={30} style={{ color: '#0284c7' }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="insights-stat">
            <div>
              <div className="stat-value">{stats.totalTransactions}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
            <Activity size={30} style={{ color: '#4f46e5' }} />
          </div>
        </div>
      </div>

      <div className="card insights-chart-card">
        <h3 className="insights-section-title">
          <TrendingUp size={20} style={{ color: '#4f46e5' }} />
          <span>Income vs Expenses ({selectedTimeLabel})</span>
        </h3>

        <IncomeExpenseChart />

        <div className="insights-legend">
          <div className="insights-legend-item">
            <span className="insights-legend-swatch insights-legend-income" />
            <span>Income</span>
          </div>
          <div className="insights-legend-item">
            <span className="insights-legend-swatch insights-legend-expense" />
            <span>Expenses</span>
          </div>
        </div>
      </div>

      <div className="insights-bottom-grid">
        <div className="card">
          <h3 className="insights-section-title">
            <TrendingDown size={20} style={{ color: '#dc2626' }} />
            <span>Spending by Category</span>
          </h3>

          <SpendingDonutChart />

          <div className="insights-category-list">
            {[
              { name: 'Transfers', color: '#3b82f6', value: categorySpending.transfers },
              { name: 'Bills', color: '#8b5cf6', value: categorySpending.bills },
              { name: 'Card Payments', color: '#f59e0b', value: categorySpending.cardPayments },
              { name: 'Others', color: '#64748b', value: categorySpending.others }
            ].map((category) => (
              <div key={category.name} className="insights-category-item">
                <span className="insights-category-dot" style={{ background: category.color }} />
                <span>{category.name}</span>
                <span className="insights-category-value">{formatCurrency(category.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="insights-section-title">Top Spending Categories</h3>
          <div className="insights-top-list">
            {topCategories.map((item) => (
              <div key={item.category} className="insights-top-row">
                <span>{item.category}</span>
                <span className="insights-top-amount">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            {topCategories.length === 0 && (
              <div className="insights-empty-top">No spending recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
