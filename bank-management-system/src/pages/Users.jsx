import { DollarSign, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { getAllUsers } from '../utils/auth';

const Modal = ({ open, title, message, confirmText, cancelText, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginBottom: 12 }}>{title}</h3>
        <div style={{ marginBottom: 18 }}>{message}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: '#e9ecef', color: '#333', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>{cancelText || 'Cancel'}</button>
          <button onClick={onConfirm} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>{confirmText || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false });

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

  const handleDelete = (userId, userName) => {
    setModal({
      open: true,
      type: 'delete',
      userId,
      title: 'Delete User',
      message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
  };

  const handleBlock = (userId, currentStatus, userName) => {
    setModal({
      open: true,
      type: 'block',
      userId,
      currentStatus,
      title: currentStatus === 'active' ? 'Block User' : 'Unblock User',
      message: currentStatus === 'active'
        ? `Are you sure you want to block ${userName}? They will not be able to access their account.`
        : `Unblock ${userName} and restore their account access?`,
      confirmText: currentStatus === 'active' ? 'Block' : 'Unblock',
      cancelText: 'Cancel',
    });
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
        toast.error('Failed to delete user: ' + error.message);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
    } else if (modal.type === 'block') {
      try {
        const newStatus = modal.currentStatus === 'active' ? 'suspended' : 'active';
        await api.users.updateStatus(modal.userId, { status: newStatus });
        toast.success(`User ${newStatus === 'active' ? 'unblocked' : 'blocked'} successfully`);
        setModal({ open: false });
        await loadUsers();
      } catch (error) {
        toast.error('Failed to update user status: ' + error.message);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleModalCancel = () => {
    setModal({ open: false });
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

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
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
            users.map((user) => {
              const isAdmin = user.role === 'admin';
              const isSelf = user.id === JSON.parse(localStorage.getItem('bank_auth_user'))?.id;
              return (
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
                    {/* Admin controls: only show for non-admin, not self */}
                    {!isAdmin && !isSelf && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          disabled={loading}
                          style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          Delete
                        </button>
                        <button
                          disabled={loading}
                          style={{ background: user.status === 'active' ? '#ffc107' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => handleBlock(user.id, user.status, user.name)}
                        >
                          {user.status === 'active' ? 'Block' : 'Unblock'}
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
      <Fragment>
        <Modal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      </Fragment>
    </div>
  );
};

export default Users;