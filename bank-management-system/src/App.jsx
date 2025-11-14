import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import ForgotPassword from './components/Auth/ForgotPassword';
import Login from './components/Auth/Login';
import PasswordResetSuccess from './components/Auth/PasswordResetSuccess';
import Register from './components/Auth/Register';
import ResetPassword from './components/Auth/ResetPassword';
import Dashboard from './components/Dashboard/Dashboard';
import Sidebar from './components/Layout/Sidebar';
import { NotificationProvider } from './components/NotificationProvider';
// ...existing code...
import AdminSupport from './pages/AdminSupport';
import Bills from './pages/Bills';
import Budget from './pages/Budget';
import Calculator from './pages/Calculator';
import Cards from './pages/Cards';
import CurrencyExchange from './pages/CurrencyExchange';
import DepositWithdraw from './pages/DepositWithdraw';
import Export from './pages/Export';
import FinancialMarkets from './pages/FinancialMarkets';
import Goals from './pages/Goals';
import Investments from './pages/Investments';
import MiniStatement from './pages/MiniStatement';
import Notifications from './pages/Notifications';
import RecurringPayments from './pages/RecurringPayments';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Statements from './pages/Statements';
// ...existing code...
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import Users from './pages/Users';
import './styles/index.css';
import { checkBackendHealth } from './utils/api';
import {
  canAccessAdminFeatures,
  initializeUsers,
  logout,
  refreshUserData
} from './utils/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Wrapper components for navigation
  const LoginWrapper = () => {
    const navigate = useNavigate();
    return <Login onLogin={handleLogin} switchToRegister={() => navigate('/register')} />;
  };

  const RegisterWrapper = () => {
    const navigate = useNavigate();
    return <Register onLogin={handleLogin} switchToLogin={() => navigate('/login')} />;
  };

  const ResetPasswordWrapper = () => {
    const navigate = useNavigate();
    return <ResetPassword onBack={() => navigate('/login')} onSuccess={() => navigate('/password-reset-success')} />;
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setError(null);
      const backendHealthy = await checkBackendHealth();
      if (!backendHealthy) {
        throw new Error('Backend server is not available. Please start the backend server.');
      }
      try {
        await Promise.race([
          initializeUsers(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 3000))
        ]);
      } catch (initError) {
        console.warn('User initialization failed:', initError.message);
      }
      // Avoid calling refresh/secure endpoints when user is on auth-related pages
      const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '/';
      const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/password-reset-success'];
      const isOnAuthPage = authPaths.some(p => pathname.startsWith(p));

      if (!isOnAuthPage) {
        // Only attempt refresh when not on an auth page
        const refreshedUser = await Promise.race([
          refreshUserData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh timeout')), 5000))
        ]);
        if (refreshedUser) {
          setUser(refreshedUser);
          setSessionExpired(false);
        } else {
          // If token is missing or invalid, clear user state.
          // Only show "Session Expired" when there was an existing cookie-based session
          setUser(null);
          const tokenExists = typeof document !== 'undefined' && (document.cookie.includes('token=') || document.cookie.includes('refreshToken='));
          setSessionExpired(!!tokenExists);
        }
      } else {
        // If user is on login/register pages, don't attempt to refresh tokens — treat as unauthenticated
        setUser(null);
        setSessionExpired(false);
      }
      const getCookie = (name) => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };

      const savedTheme = getCookie('bank_theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize application. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.cookie = `bank_theme=dark; path=/; max-age=${60 * 60 * 24 * 365}`;
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.cookie = `bank_theme=; path=/; max-age=0`;
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setError(null);
  };


  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setError(null);
    } catch {
      setUser(null);
    }
  };

  const handleSessionExpired = () => {
    // Attempt to remove any legacy client-side token cookies (non-httpOnly)
    try {
      document.cookie = 'bank_auth_token=; path=/; max-age=0';
      document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
    } catch (e) {
      // ignore
    }
    setUser(null);
    setSessionExpired(false);
    setError(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (adminOnly && !canAccessAdminFeatures(user)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  const ErrorDisplay = ({ error, onRetry }) => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '2rem', textAlign: 'center' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', maxWidth: '500px', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>⚠️ Connection Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
        <button onClick={onRetry} style={{ background: 'var(--text-accent)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }}>Retry Connection</button>
        <button onClick={() => window.location.reload()} style={{ background: 'var(--text-accent)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>Refresh Page</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: 'var(--text-accent)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>🔄 Connecting to Bank Management System...</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Checking backend connection and loading user data</div>
        </div>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', maxWidth: '500px', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>🔒 Session Expired</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your session has expired or you have been logged out. Please log in again to continue.</p>
          <button onClick={handleSessionExpired} style={{ background: 'var(--text-accent)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }}>Go to Login</button>
        </div>
      </div>
    );
  }
  if (error) {
    return <ErrorDisplay error={error} onRetry={initializeApp} />;
  }

  return (
    <Router>
      <NotificationProvider>
        {/* Wrapper components for navigation */}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginWrapper />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterWrapper />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
          <Route path="/reset-password/:token" element={user ? <Navigate to="/dashboard" replace /> : <ResetPasswordWrapper />} />
          <Route path="/password-reset-success" element={user ? <Navigate to="/dashboard" replace /> : <PasswordResetSuccess />} />

          <Route path="/dashboard" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Dashboard user={user} /></main></div></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Transactions user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Transfer user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          {/* Removed AccountManagement route */}
          <Route path="/deposit-withdraw" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><DepositWithdraw user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Cards user={user} /></main></div></ProtectedRoute>} />
          <Route path="/recurring" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><RecurringPayments user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Security user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/statements" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Statements user={user} /></main></div></ProtectedRoute>} />
          <Route path="/mini-statement" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><MiniStatement user={user} /></main></div></ProtectedRoute>} />
          <Route path="/currency-exchange" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><CurrencyExchange /></main></div></ProtectedRoute>} />
          <Route path="/financial-markets" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><FinancialMarkets /></main></div></ProtectedRoute>} />
// ...existing code...
          <Route path="/bills" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Bills user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          {/* Branch Locator removed from routes */}
          <Route path="/goals" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Goals user={user} /></main></div></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Budget user={user} /></main></div></ProtectedRoute>} />
          {/* Search page removed */}
          <Route path="/export" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Export user={user} /></main></div></ProtectedRoute>} />
          <Route path="/calculator" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Calculator /></main></div></ProtectedRoute>} />
          <Route path="/investments" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Investments user={user} /></main></div></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Notifications user={user} /></main></div></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Settings user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly={true}><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><Users /></main></div></ProtectedRoute>} />
          <Route path="/admin-support" element={<ProtectedRoute adminOnly={true}><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content fade-in"><AdminSupport user={user} /></main></div></ProtectedRoute>} />

          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;
