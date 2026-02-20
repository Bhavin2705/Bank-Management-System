import {
  BarChart3,
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Shield,
  Sun,
  User,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canAccessAdminFeatures } from '../../utils/auth';

const Sidebar = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const [isCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/transactions' },
    { id: 'cards', label: 'My Cards', icon: CreditCard, path: '/cards' },
    { id: 'payments', label: 'Payments', icon: Receipt, path: '/payments' },
    { id: 'security', label: 'Security', icon: Shield, path: '/security' },
    { id: 'statements', label: 'Statements & Reports', icon: FileText, path: '/statements' },
    { id: 'currency-exchange', label: 'Currency Exchange', icon: DollarSign, path: '/currency-exchange' },
    { id: 'insights', label: 'Insights', icon: BarChart3, path: '/insights' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ...canAccessAdminFeatures(user)
      ? [{ id: 'admin-banks', label: 'Manage Banks', icon: Users, path: '/admin-banks' }]
      : []
  ];

  return (
    <>
      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">🏦 BankPro</div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className="sidebar-footer"
          style={{
            borderTop: '1px solid var(--sidebar-hover)',
            padding: '1.2rem 1rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              padding: '0.7rem 0.8rem',
              marginBottom: '0.7rem'
            }}
          >
            <User size={22} />
            {!isCollapsed && (
              <div style={{ lineHeight: 1.35 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {user?.role}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="sidebar-nav-link"
            style={{
              padding: '0.65rem 0.8rem',
              fontSize: '0.95rem',
              width: '100%',
              gap: '0.6rem'
            }}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <button
        onClick={toggleDarkMode}
        className="theme-toggle"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </>
  );
};

export default Sidebar;