import { Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import clientData from '../utils/clientData';
import { getTransactions } from '../utils/transactions';

const Budget = ({ user }) => {
  const [budgets, setBudgets] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let mounted = true;
    clientData.getSection('budgets').then((savedBudgets) => {
      if (!mounted) return;
      if (savedBudgets && Object.keys(savedBudgets).length > 0) {
        setBudgets(savedBudgets);
      } else {
        const defaultBudgets = {
          food: 500,
          transportation: 300,
          entertainment: 200,
          utilities: 200,
          shopping: 300,
          healthcare: 150
        };
        setBudgets(defaultBudgets);
        clientData.setSection('budgets', defaultBudgets).catch(() => { });
      }
    }).catch(() => { });

    // Load transaction stats and transactions
    loadTransactions();
  }, [user.id]);

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
    { name: 'transportation', label: 'Transportation', color: '#4ECDC4' },
    { name: 'entertainment', label: 'Entertainment', color: '#45B7D1' },
    { name: 'utilities', label: 'Utilities', color: '#96CEB4' },
    { name: 'shopping', label: 'Shopping', color: '#FFEAA7' },
    { name: 'healthcare', label: 'Healthcare', color: '#DDA0DD' }
  ];

  const saveBudgets = (newBudgets) => {
    setBudgets(newBudgets);
    clientData.setSection('budgets', newBudgets).catch((err) => console.error('Save budgets failed', err));
  };

  const handleSetBudget = () => {
    if (selectedCategory && budgetAmount) {
      const newBudgets = { ...budgets, [selectedCategory]: parseFloat(budgetAmount) };
      saveBudgets(newBudgets);
      setShowForm(false);
      setSelectedCategory('');
      setBudgetAmount('');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getCategoryExpenses = (category) => {
    // This is a simplified calculation - in a real app, you'd categorize transactions
    const categoryTransactions = transactions.filter(t =>
      t.type === 'debit' &&
      t.description.toLowerCase().includes(category.toLowerCase())
    );
    return categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Budget Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track your spending against your budgets
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        {categories.map((category) => {
          const budgetAmount = budgets[category.name] || 0;
          const spent = getCategoryExpenses(category.name);
          const remaining = budgetAmount - spent;
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

          return (
            <div key={category.name} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: category.color }}>{category.label}</h3>
                <button
                  onClick={() => {
                    setSelectedCategory(category.name);
                    setBudgetAmount(budgetAmount.toString());
                    setShowForm(true);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                >
                  <Edit size={14} />
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Spent: {formatCurrency(spent)}</span>
                  <span>Budget: {formatCurrency(budgetAmount)}</span>
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
                    background: percentage > 100 ? '#dc3545' : category.color,
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
            <h3 style={{ marginBottom: '1.5rem' }}>Set Budget</h3>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Budget</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={handleSetBudget} className="btn btn-primary">
                Save Budget
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedCategory('');
                  setBudgetAmount('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
