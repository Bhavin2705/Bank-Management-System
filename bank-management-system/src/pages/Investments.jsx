import { Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const Investments = ({ user }) => {
  const [investments, setInvestments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks',
    quantity: '',
    purchasePrice: '',
    currentPrice: ''
  });

  useEffect(() => {
    loadInvestments();
  }, [user?.id]);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.investments.getAll();
      if (response.success) {
        setInvestments(response.data || []);
      }
    } catch (err) {
      console.error('Error loading investments:', err);
      setError('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        currentPrice: parseFloat(formData.currentPrice),
        totalValue: parseFloat(formData.quantity) * parseFloat(formData.currentPrice)
      };

      if (editingId) {
        const response = await api.investments.update(editingId, submitData);
        if (response.success) {
          setInvestments(investments.map(i => i._id === editingId ? response.data : i));
        }
      } else {
        const response = await api.investments.create(submitData);
        if (response.success) {
          setInvestments([...investments, response.data]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'stocks', quantity: '', purchasePrice: '', currentPrice: '' });
    } catch (err) {
      console.error('Error saving investment:', err);
      setError('Failed to save investment');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = (investment) => {
    setEditingId(investment._id);
    setFormData({
      name: investment.name,
      type: investment.type,
      quantity: investment.quantity.toString(),
      purchasePrice: investment.purchasePrice.toString(),
      currentPrice: investment.currentPrice.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) return;
    try {
      await api.investments.delete(id);
      setInvestments(investments.filter(i => i._id !== id));
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError('Failed to delete investment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateTotalInvested = (investment) => {
    return investment.quantity * investment.purchasePrice;
  };

  const calculateGainLoss = (investment) => {
    return investment.totalValue - calculateTotalInvested(investment);
  };

  const calculateGainLossPercentage = (investment) => {
    const invested = calculateTotalInvested(investment);
    return invested > 0 ? ((investment.totalValue - invested) / invested) * 100 : 0;
  };

  const totalInvested = investments.reduce((sum, inv) => sum + calculateTotalInvested(inv), 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.totalValue, 0);
  const totalGainLoss = totalValue - totalInvested;

  const investmentTypes = [
    'stocks', 'mutual_funds', 'bonds', 'fd', 'rd', 'gold', 'crypto', 'etf'
  ];

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
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: 'stocks', quantity: '', purchasePrice: '', currentPrice: '' });
            setShowForm(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          Add Investment
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

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
          <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Investment' : 'Add New Investment'}</h3>

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
                  {investmentTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  name="quantity"
                  className="form-input"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="10"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Price per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  className="form-input"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  required
                  placeholder="100.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Price per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  name="currentPrice"
                  className="form-input"
                  value={formData.currentPrice}
                  onChange={handleChange}
                  required
                  placeholder="120.00"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? 'Update' : 'Add'} Investment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading investments...</div>
        ) : investments.length > 0 ? (
          <div className="transaction-list">
            {investments.map((investment) => {
              const gainLoss = calculateGainLoss(investment);
              const gainLossPercent = calculateGainLossPercentage(investment);
              const invested = calculateTotalInvested(investment);

              return (
                <div key={investment._id} className="transaction-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {investment.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {investment.type.replace(/_/g, ' ')} • 
                      Qty: {investment.quantity} • 
                      Invested: {formatCurrency(invested)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                      {formatCurrency(investment.totalValue)}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: gainLoss >= 0 ? '#28a745' : '#dc3545',
                      fontWeight: '500'
                    }}>
                      {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEdit(investment)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(investment._id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', background: '#dc3545' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No investments added yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              Add Investment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Investments;
