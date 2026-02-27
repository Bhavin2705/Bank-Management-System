import { DollarSign, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { getAllUsers } from '../../utils/auth';
import { formatCurrencyByPreference } from '../../utils/currency';
import ConfirmModal from '../../components/common/ConfirmModal';
import { calculateTotalBalance, getBlockModalConfig, getDeleteModalConfig } from './utils';

const Users = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false });
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadUsers();
    (async () => {
      try {
        const me = await api.auth.getMe();
        if (me && me.success && me.data && me.data._id) setCurrentUserId(me.data._id);
      } catch (fetchMeError) {
        console.debug('Failed to fetch current user:', fetchMeError?.message || 'unknown error');
      }
    })();
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

  const handleDelete = (userId, userName) => {
    setModal(getDeleteModalConfig(userId, userName));
  };

  const handleBlock = (userId, currentStatus, userName) => {
    setModal(getBlockModalConfig(userId, currentStatus, userName));
  };

  const handleModalConfirm = async () => {
    setLoading(true);
    if (modal.type === 'delete') {
      try {
        await api.users.delete(modal.userId);
        toast.success('User deleted successfully');
        setModal({ open: false });
        await loadUsers();
      } catch (error) {
        toast.error(`Failed to delete user: ${error.message}`);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (modal.type === 'block') {
      try {
        const newStatus = modal.currentStatus === 'active' ? 'suspended' : 'active';
        await api.users.updateStatus(modal.userId, { status: newStatus });
        toast.success(`User ${newStatus === 'active' ? 'unblocked' : 'blocked'} successfully`);
        setModal({ open: false });
        await loadUsers();
      } catch (error) {
        toast.error(`Failed to update user status: ${error.message}`);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const totalBalance = calculateTotalBalance(users);

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

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))' }}>
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
            users.map((listedUser) => {
              const isAdmin = listedUser.role === 'admin';
              const isSelf = listedUser._id === currentUserId || listedUser.id === currentUserId;
              return (
                <div key={listedUser.id} className="transaction-item">
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
                        {listedUser.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                        {listedUser.email} â€¢ {listedUser.accountNumber}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: listedUser.role === 'admin' ? '#667eea' : '#6c757d',
                        fontWeight: '500',
                        textTransform: 'uppercase'
                      }}>
                        {listedUser.role}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#28a745' }}>
                      {formatCurrency(listedUser.balance)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      Balance
                    </div>
                    {!isAdmin && !isSelf && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          disabled={loading}
                          style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => handleDelete(listedUser.id, listedUser.name)}
                        >
                          Delete
                        </button>
                        <button
                          disabled={loading}
                          style={{ background: listedUser.status === 'active' ? '#ffc107' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => handleBlock(listedUser.id, listedUser.status, listedUser.name)}
                        >
                          {listedUser.status === 'active' ? 'Block' : 'Unblock'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={handleModalConfirm}
        onCancel={() => setModal({ open: false })}
      />
    </div>
  );
};

export default Users;
