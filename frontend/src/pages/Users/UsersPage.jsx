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
      const response = await getAllUsers();
      setUsers(Array.isArray(response?.users) ? response.users : []);
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
    if (currentStatus === 'closed' || currentStatus === 'lost' || currentStatus === 'expired') {
      toast.error('This card status cannot be changed');
      return;
    }
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
    <div className="container users-page">
      <div className="users-header">
        <h1 className="users-title">User Management</h1>
        <p className="users-subtitle">Manage all bank users and accounts</p>
      </div>

      <div className="dashboard-grid users-stats-grid">
        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.totalUsers ?? users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <UsersIcon size={32} className="users-stats-icon users-stats-icon-total" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.activeUsers ?? 0}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <Shield size={32} className="users-stats-icon users-stats-icon-active" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.adminUsers ?? 0}</div>
              <div className="stat-label">Admin Users</div>
            </div>
            <BarChart3 size={32} className="users-stats-icon users-stats-icon-admin" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{formatCurrency(totalDeposits)}</div>
              <div className="stat-label">Total Deposits</div>
            </div>
            <DollarSign size={32} className="users-stats-icon users-stats-icon-deposit" />
          </div>
        </div>
      </div>

      <div className="card users-list-card">
        <h3 className="users-section-title">
          <UsersIcon size={20} />
          All Users
        </h3>

        <div className="transaction-list">
          {users.length === 0 ? (
            <div className="users-empty-state">
              <UserIcon size={48} className="users-empty-icon" />
              <div>No users registered yet.</div>
              <small>Users will appear here once they register for accounts.</small>
            </div>
          ) : (
            users.map((listedUser) => {
              const isAdmin = listedUser.role === 'admin';
              const listedUserId = getUserId(listedUser);
              const isSelf = listedUserId === currentUserId;
              return (
                <div key={listedUserId} className="transaction-item users-row-item">
                  <div className="users-row-main">
                    <div className="users-avatar-wrap">
                      <UserIcon size={20} className="users-avatar-icon" />
                    </div>

                    <div>
                      <div className="users-name">{listedUser.name}</div>
                      <div className="users-meta">{listedUser.email} | {listedUser.accountNumber}</div>
                      <div className={`users-role-status ${listedUser.role === 'admin' ? 'is-admin' : 'is-user'}`}>
                        {listedUser.role} | {listedUser.status || 'active'}
                      </div>
                    </div>
                  </div>

                  <div className="users-row-actions">
                    <div className="users-balance">{formatCurrency(listedUser.balance)}</div>
                    <div className="users-balance-label">Balance</div>
                    <div className="users-action-group">
                      <button
                        disabled={loading}
                        className="users-action-btn users-action-activity"
                        onClick={() => loadUserDetails(listedUser)}
                      >
                        Activity
                      </button>
                      {!isAdmin && !isSelf && (
                        <button
                          disabled={loading}
                          className={`users-action-btn ${listedUser.status === 'active' ? 'users-action-block' : 'users-action-unblock'}`}
                          onClick={() => handleBlock(listedUserId, listedUser.status, listedUser.name)}
                        >
                          {listedUser.status === 'active' ? 'Block' : 'Unblock'}
                        </button>
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
        <div className="card users-activity-card">
          <h3 className="users-section-title">
            <Activity size={20} />
            Activity Console: {selectedUser.name}
          </h3>

          {detailsLoading ? (
            <div className="users-loading-note">Loading user activity...</div>
          ) : (
            <div className="users-activity-grid">
              <div>
                <h4 className="users-subsection-title">
                  <Activity size={16} />
                  Recent Transactions
                </h4>
                <div className="transaction-list">
                  {userTransactions.length === 0 ? (
                    <div className="users-muted-note">No transactions found.</div>
                  ) : (
                    userTransactions.map((transaction) => (
                      <div key={transaction._id} className="transaction-item users-activity-item">
                        <div className="users-activity-main">
                          <div className="users-activity-amount">{(transaction.type || '').toUpperCase()} - {formatCurrency(transaction.amount || 0)}</div>
                          <div className="users-activity-desc">{transaction.description || 'No description'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="users-subsection-title">
                  <CreditCard size={16} />
                  User Cards
                </h4>
                <div className="transaction-list">
                  {userCards.length === 0 ? (
                    <div className="users-muted-note">No active cards found.</div>
                  ) : (
                    userCards.map((card) => (
                      <div key={card._id} className="transaction-item users-activity-item">
                        <div className="users-card-main">
                          <div className="users-activity-amount">{card.cardName || card.cardBrand || 'Card'} **** {String(card.cardNumber || '').slice(-4)}</div>
                          <div className="users-activity-desc">Status: {(card.status || 'active').toUpperCase()}</div>
                        </div>
                        <button
                          disabled={loading || card.status === 'closed'}
                          className={`users-card-action-btn ${card.status === 'active' ? 'is-block' : 'is-unblock'}`}
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
