import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  Shield,
  User as UserIcon,
  Users as UsersIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../utils/api';
import { getAllUsers } from '../../utils/auth';
import { formatCurrencyByPreference } from '../../utils/currency';
import { calculateTotalBalance, getBlockModalConfig } from './utils';

const Users = ({ user }) => {
  const getUserId = (listedUser) => listedUser?._id || listedUser?.id || '';
  const [users, setUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [bankMetrics, setBankMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [userCards, setUserCards] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadAdminOverview();
    (async () => {
      try {
        const me = await api.auth.getMe();
        if (me && me.success && me.data && me.data._id) setCurrentUserId(me.data._id);
      } catch (fetchMeError) {
        console.debug('Failed to fetch current user:', fetchMeError?.message || 'unknown error');
      }
    })();
  }, []);

  const loadAdminOverview = async () => {
    try {
      const [statsResponse, metricsResponse] = await Promise.all([
        api.users.getStats(),
        api.users.getBankMetrics()
      ]);
      setAdminStats(statsResponse?.success ? statsResponse.data : null);
      setBankMetrics(metricsResponse?.success ? metricsResponse.data : null);
    } catch (error) {
      console.error('Error loading admin overview:', error);
      setAdminStats(null);
      setBankMetrics(null);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadUserDetails = async (listedUser) => {
    const listedUserId = getUserId(listedUser);
    if (!listedUserId) return;

    setSelectedUser(listedUser);
    setDetailsLoading(true);
    try {
      const [transactionsResponse, cardsResponse] = await Promise.all([
        api.transactions.getByUserAdmin(listedUserId, { limit: 10 }),
        api.cards.getByUserAdmin(listedUserId)
      ]);
      setUserTransactions(transactionsResponse?.data || []);
      setUserCards(cardsResponse?.data || []);
    } catch (error) {
      console.error('Error loading user details:', error);
      setUserTransactions([]);
      setUserCards([]);
      toast.error('Failed to load selected user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBlock = (userId, currentStatus, userName) => {
    setModal(getBlockModalConfig(userId, currentStatus, userName));
  };

  const handleCardStatusToggle = async (cardId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      setLoading(true);
      await api.cards.updateStatus(cardId, { status: nextStatus });
      const actionText = nextStatus === 'active'
        ? (currentStatus === 'blocked' ? 'unblocked' : 'activated')
        : 'blocked';
      toast.success(`Card ${actionText} successfully`);
      if (selectedUser) {
        await loadUserDetails(selectedUser);
      }
    } catch (error) {
      toast.error(`Failed to update card status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = async () => {
    setLoading(true);
    if (modal.type === 'block') {
      try {
        const newStatus = modal.currentStatus === 'active' ? 'suspended' : 'active';
        await api.users.updateStatus(modal.userId, { status: newStatus });
        toast.success(`User ${newStatus === 'active' ? 'unblocked' : 'blocked'} successfully`);
        setModal({ open: false });
        await Promise.all([loadUsers(), loadAdminOverview()]);
        if (selectedUser && getUserId(selectedUser) === modal.userId) {
          await loadUserDetails({ ...selectedUser, status: newStatus });
        }
      } catch (error) {
        toast.error(`Failed to update user status: ${error.message}`);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
  };

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);
  const totalBalance = calculateTotalBalance(users);
  const totalDeposits = bankMetrics?.totalDeposits ?? totalBalance;

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
              <div className="stat-value">{adminStats?.totalUsers ?? users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <UsersIcon size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{adminStats?.activeUsers ?? 0}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <Shield size={32} style={{ color: '#00a3ff' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{adminStats?.adminUsers ?? 0}</div>
              <div className="stat-label">Admin Users</div>
            </div>
            <BarChart3 size={32} style={{ color: '#f59e0b' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(totalDeposits)}</div>
              <div className="stat-label">Total Deposits</div>
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
              const listedUserId = getUserId(listedUser);
              const isSelf = listedUserId === currentUserId;
              return (
                <div key={listedUserId} className="transaction-item">
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
                        {listedUser.email} | {listedUser.accountNumber}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: listedUser.role === 'admin' ? '#667eea' : '#6c757d',
                        fontWeight: '500',
                        textTransform: 'uppercase'
                      }}>
                        {listedUser.role} | {listedUser.status || 'active'}
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
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        disabled={loading}
                        style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => loadUserDetails(listedUser)}
                      >
                        Activity
                      </button>
                      {!isAdmin && !isSelf && (
                        <>
                          <button
                            disabled={loading}
                            style={{ background: listedUser.status === 'active' ? '#ffc107' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => handleBlock(listedUserId, listedUser.status, listedUser.name)}
                          >
                            {listedUser.status === 'active' ? 'Block' : 'Unblock'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} />
            Activity Console: {selectedUser.name}
          </h3>

          {detailsLoading ? (
            <div style={{ color: '#6c757d' }}>Loading user activity...</div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
              <div>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={16} />
                  Recent Transactions
                </h4>
                <div className="transaction-list">
                  {userTransactions.length === 0 ? (
                    <div style={{ color: '#6c757d', padding: '1rem' }}>No transactions found.</div>
                  ) : (
                    userTransactions.map((transaction) => (
                      <div key={transaction._id} className="transaction-item" style={{ alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {(transaction.type || '').toUpperCase()} - {formatCurrency(transaction.amount || 0)}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#6c757d', overflowWrap: 'anywhere' }}>
                            {transaction.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={16} />
                  User Cards
                </h4>
                <div className="transaction-list">
                  {userCards.length === 0 ? (
                    <div style={{ color: '#6c757d', padding: '1rem' }}>No active cards found.</div>
                  ) : (
                    userCards.map((card) => (
                      <div key={card._id} className="transaction-item" style={{ alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>
                            {card.cardName || card.cardBrand || 'Card'} •••• {String(card.cardNumber || '').slice(-4)}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#6c757d' }}>
                            Status: {(card.status || 'active').toUpperCase()}
                          </div>
                        </div>
                        <button
                          disabled={loading || card.status === 'closed'}
                          style={{ background: card.status === 'active' ? '#f59e0b' : '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.82rem' }}
                          onClick={() => handleCardStatusToggle(card._id, card.status)}
                        >
                          {card.status === 'active' ? 'Block' : card.status === 'blocked' ? 'Unblock' : 'Activate'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
