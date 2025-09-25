import {
  ArrowRightLeft,
  ArrowUpCircle,
  BarChart3,
  Bell,
  Calculator,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Home,
  LogOut,
  MapPin,
  Moon,
  PieChart,
  Receipt,
  Repeat,
  Search,
  Settings,
  Shield,
  Sun,
  Target,
  TrendingUp,
  User,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canAccessAdminFeatures } from '../../utils/auth';

const Sidebar = ({
  user,
  onLogout,
  darkMode,
  toggleDarkMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/transactions' },
    { id: 'transfer', label: 'Transfer Money', icon: ArrowRightLeft, path: '/transfer' },
    // Removed Account Management from sidebar
    { id: 'deposit-withdraw', label: 'Deposit & Withdraw', icon: ArrowUpCircle, path: '/deposit-withdraw' },
    { id: 'cards', label: 'My Cards', icon: CreditCard, path: '/cards' },
    { id: 'recurring', label: 'Recurring Payments', icon: Repeat, path: '/recurring' },
    { id: 'security', label: 'Security', icon: Shield, path: '/security' },
    { id: 'statements', label: 'Statements', icon: FileText, path: '/statements' },
    { id: 'mini-statement', label: 'Mini Statement', icon: Receipt, path: '/mini-statement' },
    { id: 'currency-exchange', label: 'Currency Exchange', icon: DollarSign, path: '/currency-exchange' },
    { id: 'financial-markets', label: 'Financial Markets', icon: BarChart3, path: '/financial-markets' },
    { id: 'branch-locator', label: 'Branch Locator', icon: MapPin, path: '/branch-locator' },
    // ...existing code...
    { id: 'bills', label: 'Bill Payments', icon: FileText, path: '/bills' },
    { id: 'goals', label: 'Savings Goals', icon: Target, path: '/goals' },
    { id: 'budget', label: 'Budget', icon: PieChart, path: '/budget' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'export', label: 'Export', icon: Download, path: '/export' },
    { id: 'calculator', label: 'Loan Calculator', icon: Calculator, path: '/calculator' },
    { id: 'investments', label: 'Investments', icon: TrendingUp, path: '/investments' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  if (canAccessAdminFeatures(user)) {
    navItems.splice(2, 0, { id: 'users', label: 'Users', icon: Users, path: '/users' });
    // ...existing code...
  }

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">🏦 BankPro</div>
        </div>

        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
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

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div style={{
            padding: '1rem',
            borderTop: '1px solid var(--sidebar-hover)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <User size={20} />
            {!isCollapsed && (
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{user?.role}</div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="sidebar-nav-link"
            style={{ width: '100%', marginTop: '0.5rem', color: 'white' }}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

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
