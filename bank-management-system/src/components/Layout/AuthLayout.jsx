import { Home, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, darkMode, toggleDarkMode }) => {
  const [isCollapsed] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        className="sidebar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A8A 50%, #00D4FF 100%)',
          color: 'white',
          width: '280px',
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          className="sidebar-header"
          style={{
            padding: '1.5rem 1rem',
            borderBottom: '1px solid rgba(0, 212, 255, 0.2)'
          }}
        >
          <div
            className="sidebar-brand"
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🏦 BankPro
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <ul className="sidebar-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="sidebar-nav-item" style={{ margin: 0 }}>
                  <Link
                    to={item.path}
                    className="sidebar-nav-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      color: 'white',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      borderLeft: '3px solid transparent',
                      fontSize: '0.95rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                      e.currentTarget.style.borderLeftColor = '#00D4FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
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
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <button
            onClick={toggleDarkMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(0, 212, 255, 0.1)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
            }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && (darkMode ? 'Light Mode' : 'Dark Mode')}
          </button>
        </div>
      </aside>

      <main
        style={{
          marginLeft: '280px',
          flex: 1,
          background: 'var(--bg-secondary)',
          minHeight: '100vh'
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
