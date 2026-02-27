import {
  BarChart3,
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Settings,
  Shield,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canAccessAdminFeatures } from '../../utils/auth';

const BASE_NAV_ITEMS = [
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
];

const ADMIN_NAV_ITEMS = [
  { id: 'admin-banks', label: 'Manage Banks', icon: Users, path: '/admin-banks' },
];

const Sidebar = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const [isCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = useMemo(() => (
    canAccessAdminFeatures(user)
      ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : BASE_NAV_ITEMS
  ), [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    onLogout();
  };

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMobileMenuOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu backdrop"
        />
      )}

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A8A 50%, #00D4FF 100%)',
          color: 'white',
        }}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">BankPro</div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
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
            borderTop: '1px solid rgba(0, 212, 255, 0.3)',
            padding: '1.2rem 1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              padding: '0.7rem 0.8rem',
              marginBottom: '0.7rem',
              color: 'white',
            }}
          >
            <User size={22} />
            {!isCollapsed && (
              <div style={{ lineHeight: 1.35 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, color: 'white' }}>{user?.role}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogoutClick}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.95rem',
              width: '100%',
              gap: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A8A 50%, #00D4FF 100%)',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            <LogOut size={18} />
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