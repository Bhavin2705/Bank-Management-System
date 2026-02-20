import { AlertTriangle, Bell, CheckCircle, CreditCard, ShieldAlert, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/notifications', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`Failed: ${response.status}`);
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Notifications error:', err);
        setError('Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('warning') || t.includes('alert')) return <AlertTriangle size={20} />;
    if (t.includes('transaction') || t.includes('debit') || t.includes('credit')) return <ShoppingBag size={20} />;
    if (t.includes('payment') || t.includes('success')) return <CheckCircle size={20} />;
    if (t.includes('security') || t.includes('login')) return <ShieldAlert size={20} />;
    if (t.includes('card')) return <CreditCard size={20} />;
    return <Bell size={20} />;
  };

  const getIconColor = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('warning') || t.includes('alert')) return '#f59e0b';
    if (t.includes('transaction') || t.includes('debit') || t.includes('credit')) return '#3b82f6';
    if (t.includes('payment') || t.includes('success')) return '#10b981';
    if (t.includes('security') || t.includes('login')) return '#f59e0b';
    if (t.includes('card')) return '#ef4444';
    return '#667eea';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const hasUnread = notifications.some(n => !n.read);

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Notifications
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Recent account and transaction updates
          </p>
        </div>

        {hasUnread && notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'var(--text-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          color: '#dc3545',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid rgba(220, 53, 69, 0.3)'
        }}>
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '7rem 1rem',
          color: 'var(--text-secondary)',
          fontSize: '1.15rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ fontWeight: 600, marginBottom: '0.6rem' }}>
            You’re all caught up!
          </h3>
          <p>No new notifications right now.</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '1.25rem 1.5rem',
                background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.07)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.2rem'
              }}
            >
              <div style={{
                padding: '10px',
                background: `${getIconColor(n.type)}15`,
                borderRadius: '10px',
                color: getIconColor(n.type),
                flexShrink: 0
              }}>
                {getIcon(n.type)}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontWeight: n.read ? 400 : 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.45
                }}>
                  {n.message}
                </p>
                <p style={{
                  margin: '0.4rem 0 0',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)'
                }}>
                  {formatTimestamp(n.timestamp)}
                </p>
              </div>

              {!n.read && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    background: 'var(--text-accent)',
                    borderRadius: '50%'
                  }} />
                  <button
                    onClick={() => markAsRead(n.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.82rem',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Mark read
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;