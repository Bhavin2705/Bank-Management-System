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
import Notifications from './pages/Notifications';
import RecurringPayments from './pages/RecurringPayments';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Statements from './pages/Statements';
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import Users from './pages/Users';
import AdminBanks from './pages/AdminBanks';
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
      if (!backendHealthy) throw new Error('Backend server is not available');
      try {
        await Promise.race([
          initializeUsers(),
          new Promise((_, reject) => setTimeout(() => reject(new Error()), 3000))
        ]);
      } catch {}
      const pathname = window.location.pathname;
      const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/password-reset-success'];
      const isOnAuthPage = authPaths.some(p => pathname.startsWith(p));
      if (!isOnAuthPage) {
        const refreshedUser = await Promise.race([
          refreshUserData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error()), 5000))
        ]);
        if (refreshedUser) {
          setUser(refreshedUser);
          setSessionExpired(false);
        } else {
          setUser(null);
          const tokenExists = document.cookie.includes('token=') || document.cookie.includes('refreshToken=');
          setSessionExpired(!!tokenExists);
        }
      } else {
        setUser(null);
        setSessionExpired(false);
      }
      const match = document.cookie.match(/bank_theme=([^;]+)/);
      if (match && match[1] === 'dark') {
        setDarkMode(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
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
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const handleSessionExpired = () => {
    document.cookie = 'bank_auth_token=; path=/; max-age=0';
    document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
    setUser(null);
    setSessionExpired(false);
    setError(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !canAccessAdminFeatures(user)) return <Navigate to="/dashboard" replace />;
    return children;
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading…</div>;
  }

  if (sessionExpired) {
    return <button onClick={handleSessionExpired}>Go to Login</button>;
  }

  if (error) {
    return <button onClick={initializeApp}>Retry</button>;
  }

  return (
    <Router>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginWrapper />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterWrapper />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
          <Route path="/reset-password/:token" element={user ? <Navigate to="/dashboard" replace /> : <ResetPasswordWrapper />} />
          <Route path="/password-reset-success" element={user ? <Navigate to="/dashboard" replace /> : <PasswordResetSuccess />} />

          <Route path="/dashboard" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content"><Dashboard user={user} /></main></div></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content"><Transactions user={user} onUserUpdate={handleUserUpdate} /></main></div></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content"><Cards user={user} /></main></div></ProtectedRoute>} />
          <Route path="/admin-banks" element={<ProtectedRoute adminOnly={true}><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content"><AdminBanks /></main></div></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly={true}><div className="app-layout"><Sidebar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="main-content"><Users /></main></div></ProtectedRoute>} />

          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;
