import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    const addNotification = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const notification = {
            id,
            message,
            type,
            duration
        };

        setNotifications(prev => [...prev, notification]);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    }, [removeNotification]);

    const showSuccess = useCallback((message, duration) => {
        return addNotification(message, 'success', duration);
    }, [addNotification]);

    const showError = useCallback((message, duration) => {
        return addNotification(message, 'error', duration);
    }, [addNotification]);

    const showWarning = useCallback((message, duration) => {
        return addNotification(message, 'warning', duration);
    }, [addNotification]);

    const showInfo = useCallback((message, duration) => {
        return addNotification(message, 'info', duration);
    }, [addNotification]);

    const value = {
        notifications,
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationContainer />
        </NotificationContext.Provider>
    );
};

const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotification();

    if (notifications.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {notifications.map(notification => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={removeNotification}
                />
            ))}
        </div>
    );
};

const NotificationItem = ({ notification, onRemove }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} />;
            case 'error':
                return <XCircle size={20} />;
            case 'warning':
                return <AlertCircle size={20} />;
            case 'info':
            default:
                return <Info size={20} />;
        }
    };

    const getColors = (type) => {
        switch (type) {
            case 'success':
                return {
                    background: '#d4edda',
                    border: '#c3e6cb',
                    text: '#155724',
                    icon: '#28a745'
                };
            case 'error':
                return {
                    background: '#f8d7da',
                    border: '#f5c6cb',
                    text: '#721c24',
                    icon: '#dc3545'
                };
            case 'warning':
                return {
                    background: '#fff3cd',
                    border: '#ffeaa7',
                    text: '#856404',
                    icon: '#ffc107'
                };
            case 'info':
            default:
                return {
                    background: '#d1ecf1',
                    border: '#bee5eb',
                    text: '#0c5460',
                    icon: '#17a2b8'
                };
        }
    };

    const colors = getColors(notification.type);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '300px',
            maxWidth: '500px',
            animation: 'slideInRight 0.3s ease-out'
        }}>
            <div style={{ color: colors.icon, flexShrink: 0 }}>
                {getIcon(notification.type)}
            </div>
            <div style={{
                flex: 1,
                color: colors.text,
                fontSize: '14px',
                fontWeight: '500'
            }}>
                {notification.message}
            </div>
            <button
                onClick={() => onRemove(notification.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: colors.text,
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.7'}
            >
                <X size={16} />
            </button>
        </div>
    );
};
