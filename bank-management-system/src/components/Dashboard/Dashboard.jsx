import { Activity, IndianRupee, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTransactionStats } from '../../utils/transactions';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Debug: log user object to check createdAt and other fields
      // Remove this after debugging
      // eslint-disable-next-line no-console
      console.log('Dashboard user object:', user);
    }
    const fetchStats = async () => {
      try {
        setLoading(true);
        const transactionStats = await getTransactionStats();
        setStats(transactionStats);
        setError('');
      } catch (error) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchStats();
    }
  }, [user?._id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // Use firstLogin flag from backend for accurate onboarding
  const isNewUser = (() => {
    if (user && user.firstLogin) {
      return true;
    }
    return false;
  })();

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          {isNewUser ? 'Welcome' : 'Welcome back'}, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Account: {user?.accountNumber}
        </p>

        {isNewUser && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>🎉 Welcome to Your New Account!</h3>
            <p style={{ margin: '0', fontSize: '0.9rem' }}>
              Your account is ready! Make your first deposit to start using banking features.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid var(--error-border)'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading dashboard...</div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{formatCurrency(user?.balance || 0)}</div>
                  <div className="stat-label">Current Balance</div>
                </div>
                <IndianRupee size={32} style={{ color: '#667eea' }} />
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{formatCurrency(stats.monthlyIncome)}</div>
                  <div className="stat-label">Monthly Income</div>
                </div>
                <TrendingUp size={32} style={{ color: '#28a745' }} />
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{formatCurrency(stats.monthlyExpenses)}</div>
                  <div className="stat-label">Monthly Expenses</div>
                </div>
                <TrendingDown size={32} style={{ color: '#dc3545' }} />
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

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} />
              Recent Transactions
            </h3>

            {stats.recentTransactions.length > 0 ? (
              <div className="transaction-list">
                {stats.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                        {transaction.description}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: '600',
                      color: transaction.type === 'credit' ? 'var(--success)' : 'var(--error)'
                    }}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                {user?.balance === 0 ? (
                  <div>
                    <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>💰 Ready to Start Banking?</div>
                    <div>Make your first deposit to begin tracking transactions</div>
                  </div>
                ) : (
                  <div>No transactions yet</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
