import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const Investments = ({ user }) => {
  const [investments, setInvestments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks',
    amount: '',
    currentValue: ''
  });

  useEffect(() => {
    const savedInvestments = localStorage.getItem(`investments_${user.id}`);
    if (savedInvestments) {
      setInvestments(JSON.parse(savedInvestments));
    }
  }, [user.id]);

  const saveInvestments = (newInvestments) => {
    setInvestments(newInvestments);
    localStorage.setItem(`investments_${user.id}`, JSON.stringify(newInvestments));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newInvestment = {
      id: Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      currentValue: parseFloat(formData.currentValue),
      purchaseDate: new Date().toISOString()
    };

    saveInvestments([...investments, newInvestment]);
    setShowForm(false);
    setFormData({ name: '', type: 'stocks', amount: '', currentValue: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateGainLoss = (investment) => {
    return investment.currentValue - investment.amount;
  };

  const calculateGainLossPercentage = (investment) => {
    return ((investment.currentValue - investment.amount) / investment.amount) * 100;
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalGainLoss = totalValue - totalInvested;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Investment Portfolio
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your investment performance
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add Investment
        </button>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(totalValue)}</div>
              <div className="stat-label">Portfolio Value</div>
            </div>
            <TrendingUp size={32} style={{ color: '#28a745' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: totalGainLoss >= 0 ? '#28a745' : '#dc3545' }}>
                {formatCurrency(totalGainLoss)}
              </div>
              <div className="stat-label">Total Gain/Loss</div>
            </div>
            {totalGainLoss >= 0 ?
              <TrendingUp size={32} style={{ color: '#28a745' }} /> :
              <TrendingDown size={32} style={{ color: '#dc3545' }} />
            }
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{investments.length}</div>
              <div className="stat-label">Investments</div>
            </div>
            <TrendingUp size={32} style={{ color: '#667eea' }} />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Investment</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Investment Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Apple Inc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  name="type"
                  className="form-input"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="stocks">Stocks</option>
                  <option value="bonds">Bonds</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="mutual-funds">Mutual Funds</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  className="form-input"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  placeholder="1000.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Value</label>
                <input
                  type="number"
                  step="0.01"
                  name="currentValue"
                  className="form-input"
                  value={formData.currentValue}
                  onChange={handleChange}
                  required
                  placeholder="1200.00"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Add Investment
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} />
          Your Investments
        </h3>

        {investments.length > 0 ? (
          <div className="transaction-list">
            {investments.map((investment) => {
              const gainLoss = calculateGainLoss(investment);
              const gainLossPercent = calculateGainLossPercentage(investment);

              return (
                <div key={investment.id} className="transaction-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {investment.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {investment.type.charAt(0).toUpperCase() + investment.type.slice(1)} •
                      Invested: {formatCurrency(investment.amount)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                      {formatCurrency(investment.currentValue)}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: gainLoss >= 0 ? '#28a745' : '#dc3545',
                      fontWeight: '500'
                    }}>
                      {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No investments added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Investments;
