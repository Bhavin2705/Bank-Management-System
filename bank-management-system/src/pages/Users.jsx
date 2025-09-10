import { DollarSign, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllUsers } from '../utils/auth';

const Users = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          User Management
        </h1>
        <p style={{ color: '#6c757d' }}>
          Manage all bank users and accounts
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <UsersIcon size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(totalBalance)}</div>
              <div className="stat-label">Total Balance</div>
            </div>
            <DollarSign size={32} style={{ color: '#28a745' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UsersIcon size={20} />
          All Users
        </h3>

        <div className="transaction-list">
          {users.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 2rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              <UserIcon size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
              <div>No users registered yet.</div>
              <small>Users will appear here once they register for accounts.</small>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    background: '#f8f9fa',
                    border: '2px solid #e9ecef'
                  }}>
                    <UserIcon size={20} style={{ color: '#667eea' }} />
                  </div>

                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                      {user.email} • {user.accountNumber}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: user.role === 'admin' ? '#667eea' : '#6c757d',
                      fontWeight: '500',
                      textTransform: 'uppercase'
                    }}>
                      {user.role}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#28a745' }}>
                    {formatCurrency(user.balance)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                    Balance
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;
