import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { getTransactions } from '../utils/transactions';

const Budget = ({ user }) => {
  const [budgets, setBudgets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    amount: '',
    period: 'monthly'
  });

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadBudgets();
    loadTransactions();
  }, [user?.id]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.budgets.getAll();
      if (response.success) {
        setBudgets(response.data || []);
      }
    } catch (err) {
      console.error('Error loading budgets:', err);
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const userTransactions = await getTransactions();
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const categories = [
    { name: 'food', label: 'Food & Dining', color: '#FF6B6B' },
    { name: 'transport', label: 'Transportation', color: '#4ECDC4' },
    { name: 'entertainment', label: 'Entertainment', color: '#45B7D1' },
    { name: 'utilities', label: 'Utilities', color: '#96CEB4' },
    { name: 'shopping', label: 'Shopping', color: '#FFEAA7' },
    { name: 'healthcare', label: 'Healthcare', color: '#DDA0DD' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingId) {
        const response = await api.budgets.update(editingId, submitData);
        if (response.success) {
          setBudgets(budgets.map(b => b._id === editingId ? response.data : b));
        }
      } else {
        const response = await api.budgets.create(submitData);
        if (response.success) {
          setBudgets([...budgets, response.data]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
    } catch (err) {
      console.error('Error saving budget:', err);
      setError('Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await api.budgets.delete(id);
      setBudgets(budgets.filter(b => b._id !== id));
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Failed to delete budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingId(budget._id);
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period
    });
    setShowForm(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getCategoryExpenses = (category) => {
    const categoryTransactions = transactions.filter(t =>
      t.type === 'debit' &&
      t.category === category
    );
    return categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.name === category);
    return cat ? cat.color : '#667eea';
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.name === category);
    return cat ? cat.label : category;
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Budget Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your spending against your budgets
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
            setShowForm(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          New Budget
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No budgets yet. Create one to get started!</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Create Budget
          </button>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          {budgets.map((budget) => {
            const spent = getCategoryExpenses(budget.category);
            const remaining = budget.amount - spent;
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const color = getCategoryColor(budget.category);

            return (
              <div key={budget._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color }}>{budget.name}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {getCategoryLabel(budget.category)} • {budget.period}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEdit(budget)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget._id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', background: '#dc3545' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Spent: {formatCurrency(spent)}</span>
                    <span>Budget: {formatCurrency(budget.amount)}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(percentage, 100)}%`,
                      height: '100%',
                      background: percentage > 100 ? '#dc3545' : color,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {percentage.toFixed(1)}% used
                  </div>
                </div>

                <div style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  background: remaining < 0 ? '#f8d7da' : '#d4edda',
                  color: remaining < 0 ? '#721c24' : '#155724',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  {remaining < 0 ? 'Over budget' : 'Remaining'}: {formatCurrency(Math.abs(remaining))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Budget' : 'Create Budget'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Budget Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Groceries"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Period</label>
                <select
                  className="form-input"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingId ? 'Update' : 'Create'} Budget
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', category: 'food', amount: '', period: 'monthly' });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
