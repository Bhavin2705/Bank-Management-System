import { Home, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, darkMode, toggleDarkMode }) => {
  const [isCollapsed] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' }
  ];

  return (
    <div className="auth-layout">
      <aside className="sidebar auth-layout-sidebar">
        <div className="sidebar-header auth-layout-sidebar-header">
          <div className="sidebar-brand auth-layout-sidebar-brand">BankPro</div>
        </div>

        <nav className="auth-layout-nav">
          <ul className="sidebar-nav auth-layout-nav-list">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="sidebar-nav-item auth-layout-nav-item">
                  <Link
                    to={item.path}
                    className="sidebar-nav-link auth-layout-nav-link"
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer auth-layout-footer">
          <button
            onClick={toggleDarkMode}
            className="auth-layout-theme-toggle"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && (darkMode ? 'Light Mode' : 'Dark Mode')}
          </button>
        </div>
      </aside>

      <main className="auth-layout-main">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
