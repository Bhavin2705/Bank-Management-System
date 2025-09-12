import { CreditCard, Home, LogOut, User, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <div className="navbar-brand">
            🏦 BankPro
          </div>

          <div className="navbar-nav">
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <Home size={16} />
              Dashboard
            </Link>

            <Link
              to="/transactions"
              className={`nav-link ${location.pathname === '/transactions' ? 'active' : ''}`}
            >
              <CreditCard size={16} />
              Transactions
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/users"
                className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
              >
                <Users size={16} />
                Users
              </Link>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} />
                <span>{user?.name}</span>
              </div>

              <button
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', color: 'white' }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
