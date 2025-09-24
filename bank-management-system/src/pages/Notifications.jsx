import { AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    generateNotifications();
  }, [user]);

  const generateNotifications = () => {
    const newNotifications = [];

    // Low balance alert
    if (user.balance < 50 && user.balance > 0) {
      newNotifications.push({
        id: 'low-balance',
        type: 'warning',
        title: 'Low Balance Alert',
        message: `Your account balance is low: Rs${user.balance.toFixed(2)}. Consider adding funds.`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    // Recent large transactions
    // This would normally check recent transactions, but for demo purposes:
    newNotifications.push({
      id: 'welcome',
      type: 'info',
      title: 'Welcome to BankPro!',
      message: 'Thank you for using our banking system. Explore all the features available.',
      timestamp: new Date().toISOString(),
      read: false
    });

    setNotifications(newNotifications);
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={20} style={{ color: '#ffc107' }} />;
      case 'success':
        return <CheckCircle size={20} style={{ color: '#28a745' }} />;
      default:
        return <Bell size={20} style={{ color: '#667eea' }} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Notifications
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Stay updated with your account activity
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} />
          Recent Notifications
        </h3>

        {notifications.length > 0 ? (
          <div className="transaction-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="transaction-item"
                style={{
                  borderLeft: notification.read ? '4px solid var(--border-color)' : '4px solid var(--text-accent)',
                  background: notification.read ? 'var(--bg-secondary)' : 'rgba(102, 126, 234, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  {getIcon(notification.type)}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {notification.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatDate(notification.timestamp)}
                    </div>
                  </div>
                </div>

                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No notifications at this time</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Notification Settings</h3>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500' }}>Low Balance Alerts</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get notified when your balance is low</div>
            </div>
            <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500' }}>Transaction Alerts</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get notified for large transactions</div>
            </div>
            <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '500' }}>Weekly Summary</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive weekly account summaries</div>
            </div>
            <input type="checkbox" style={{ transform: 'scale(1.2)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
