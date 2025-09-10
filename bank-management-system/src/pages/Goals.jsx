import { Plus, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const Goals = ({ user }) => {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: ''
  });

  useEffect(() => {
    const savedGoals = localStorage.getItem(`goals_${user.id}`);
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, [user.id]);

  const saveGoals = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem(`goals_${user.id}`, JSON.stringify(newGoals));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newGoal = {
      id: Date.now().toString(),
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount),
      createdAt: new Date().toISOString()
    };

    saveGoals([...goals, newGoal]);
    setShowForm(false);
    setFormData({ name: '', targetAmount: '', currentAmount: '0', targetDate: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const updateProgress = (goalId, amount) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: goal.currentAmount + parseFloat(amount) }
        : goal
    );
    saveGoals(updatedGoals);
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
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Create New Goal</h3>

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
                <input
                  type="date"
                  name="targetDate"
                  className="form-input"
                  value={formData.targetDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Create Goal
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

      <div className="dashboard-grid">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
          return (
            <div key={goal.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{goal.name}</h3>
                <Target size={20} />
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
                  {progress.toFixed(1)}% Complete
                </div>
              </div>

              <button
                onClick={() => {
                  const amount = prompt('Enter amount to add:');
                  if (amount && !isNaN(amount)) {
                    updateProgress(goal.id, parseFloat(amount));
                  }
                }}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <TrendingUp size={16} />
                Add Progress
              </button>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Target size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
          <h3>No savings goals yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Create your first savings goal to start tracking your progress!</p>
        </div>
      )}
    </div>
  );
};

export default Goals;
