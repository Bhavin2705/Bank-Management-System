import { Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import CustomCalendar from '../components/UI/CustomCalendar';
import { api } from '../utils/api';
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../utils/date';

const Goals = ({ user }) => {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadGoals();
  }, [user?.id]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.goals.getAll();
      if (response.success) {
        setGoals(response.data || []);
      }
    } catch (err) {
      console.error('Error loading goals:', err);
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount),
        targetDate: formData.targetDate
      };

      if (editingId) {
        const response = await api.goals.update(editingId, submitData);
        if (response.success) {
          setGoals(goals.map(g => g._id === editingId ? response.data : g));
        }
      } else {
        const response = await api.goals.create(submitData);
        if (response.success) {
          setGoals([...goals, response.data]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        category: 'other',
        targetAmount: '',
        currentAmount: '0',
        targetDate: '',
        priority: 'medium'
      });
    } catch (err) {
      console.error('Error saving goal:', err);
      setError('Failed to save goal');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = (goal) => {
    setEditingId(goal._id);
    setFormData({
      name: goal.name,
      category: goal.category || 'other',
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate ? toLocalYYYYMMDD(new Date(goal.targetDate)) : '',
      priority: goal.priority || 'medium'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.goals.delete(id);
      setGoals(goals.filter(g => g._id !== id));
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal');
    }
  };

  const updateProgress = async (goalId, additionalAmount) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    try {
      const newAmount = goal.currentAmount + parseFloat(additionalAmount);
      const response = await api.goals.update(goalId, {
        ...goal,
        currentAmount: newAmount
      });
      if (response.success) {
        setGoals(goals.map(g => g._id === goalId ? response.data : g));
      }
    } catch (err) {
      console.error('Error updating goal progress:', err);
      setError('Failed to update goal progress');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const categories = [
    'emergency_fund', 'vacation', 'car', 'house', 'education',
    'retirement', 'wedding', 'business', 'investment', 'debt_payoff', 'other'
  ];

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Savings Goals
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your savings progress
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              category: 'other',
              targetAmount: '',
              currentAmount: '0',
              targetDate: '',
              priority: 'medium'
            });
            setShowForm(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          New Goal
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

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Goal' : 'Create New Goal'}</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Goal Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Vacation Fund"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-input"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  name="priority"
                  className="form-input"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="targetAmount"
                  className="form-input"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  required
                  placeholder="5000.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="currentAmount"
                  className="form-input"
                  value={formData.currentAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date</label>
                <CustomCalendar
                  value={formData.targetDate ? fromLocalYYYYMMDD(formData.targetDate) : null}
                  onChange={(date) => setFormData({ ...formData, targetDate: date ? toLocalYYYYMMDD(date) : '' })}
                  placeholder="Select target date"
                  minDate={new Date()}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? 'Update' : 'Create'} Goal
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Target size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
          <h3>No savings goals yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Create your first savings goal to start tracking your progress!</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create Goal
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            const daysRemaining = goal.targetDate
              ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={goal._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{goal.name}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {goal.category?.replace(/_/g, ' ')} • Priority: {goal.priority}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEdit(goal)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', background: '#dc3545' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {progress.toFixed(1)}% Complete {daysRemaining !== null && `• ${daysRemaining} days left`}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const amount = prompt('Enter amount to add:');
                    if (amount && !isNaN(amount)) {
                      updateProgress(goal._id, parseFloat(amount));
                    }
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <TrendingUp size={16} />
                  Add Progress
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;
