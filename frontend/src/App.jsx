import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, BrowserRouter as Router } from 'react-router-dom';

import { NotificationProvider } from './components/providers/NotificationProvider';
import Sidebar from './components/Layout/Sidebar';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import PasswordResetSuccess from './components/Auth/PasswordResetSuccess';

import Dashboard from './components/Dashboard/Dashboard';
import {
  AdminBanks,
  Budget,
  Cards,
  CurrencyExchange,
  Insights,
  Notifications,
  Payments,
  Security,
  Settings,
  Statements,
  Transactions,
  Users,
} from './pages';

import { api, checkBackendHealth } from './utils/api';
import { setExchangeRates } from './utils/currency';
import {
  canAccessAdminFeatures,
  initializeUsers,
  logout,
  refreshUserData,
} from './utils/auth';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [backendWaking, setBackendWaking] = useState(false);
  const [wakeAttempt, setWakeAttempt] = useState(0);

  const retryTimeoutRef = useRef(null);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const applyTheme = (userData) => {
    const isDark = userData?.preferences?.theme === 'dark';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  const toggleDarkMode = async () => {
    if (!user) return;

    const nextDark = !darkMode;
    applyTheme({ ...user, preferences: { ...user.preferences, theme: nextDark ? 'dark' : 'light' } });

    try {
      const updated = {
        ...user.preferences,
        theme: nextDark ? 'dark' : 'light',
      };
      const res = await api.settings.updatePreferences(updated);
      if (res?.success) {
        setUser((prev) => ({ ...prev, preferences: res.data }));
      }
    } catch {
      // rollback on failure
      applyTheme(user);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    applyTheme(userData);
    setError(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      applyTheme(null);
      setError(null);
    }
  };

  const handleSessionExpired = () => {
    // clear auth cookies
    document.cookie = 'bank_auth_token=; path=/; max-age=0';
    document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
    setUser(null);
    setSessionExpired(false);
    setError(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    applyTheme(updatedUser);
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Initialization & Health check
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const scheduleRetry = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    setBackendWaking(true);
    setWakeAttempt((c) => c + 1);

    retryTimeoutRef.current = setTimeout(() => initializeApp({ silent: true }), 5000);
  };

  const initializeApp = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    const pathname = window.location.pathname;
    const isAuthPage = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/password-reset-success',
    ].some((p) => pathname.startsWith(p));

    // Check backend availability
    if (!(await checkBackendHealth())) {
      scheduleRetry();
      setLoading(false);
      return;
    }

    // Reset retry state
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setBackendWaking(false);
    setWakeAttempt(0);

    try {
      // Non-blocking user init (best effort)
      await Promise.race([
        initializeUsers(),
        new Promise((_, r) => setTimeout(() => r(new Error('init timeout')), 3000)),
      ]).catch(() => {});

      if (!isAuthPage) {
        const freshUser = await Promise.race([
          refreshUserData(),
          new Promise((_, r) => setTimeout(() => r(new Error('refresh timeout')), 5000)),
        ]).catch(() => null);

        if (freshUser) {
          setUser(freshUser);
          applyTheme(freshUser);
          setSessionExpired(false);
        } else {
          setUser(null);
          applyTheme(null);
          const hasToken = document.cookie.includes('token=') || document.cookie.includes('refreshToken=');
          setSessionExpired(!!hasToken);
        }
      } else {
        setUser(null);
        applyTheme(null);
        setSessionExpired(false);
      }
    } catch (err) {
      setError(err.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  // Load exchange rates when user / currency preference changes
  useEffect(() => {
    if (!user?.preferences?.currency) {
      setExchangeRates(null);
      return;
    }

    (async () => {
      try {
        const res = await api.exchange.getRates();
        if (res?.success && res.rates) {
          setExchangeRates(res.rates);
        }
      } catch (err) {
        console.error('Failed to load exchange rates', err);
      }
    })();
  }, [user?._id, user?.preferences?.currency]);

  useEffect(() => {
    initializeApp();
    return () => clearTimeout(retryTimeoutRef.current);
  }, []);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Route Wrappers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const AuthWrapper = ({ children }) => (user ? <Navigate to="/dashboard" replace /> : children);

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !canAccessAdminFeatures(user)) return <Navigate to="/dashboard" replace />;
    return children;
  };

  const Layout = ({ children }) => (
    <div className="app-layout">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <main className="main-content">{children}</main>
    </div>
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Render
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return <BackendWakeScreen message="Preparing Your Workspace" />;
  }

  if (sessionExpired) {
    return (
      <SessionExpiredScreen
        onClick={() => {
          handleSessionExpired();
          window.location.href = '/login';
        }}
      />
    );
  }

  if (backendWaking) {
    return <BackendWakeScreen message="Waking Secure Banking Services" attempt={wakeAttempt} />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          setError(null);
          initializeApp();
        }}
      />
    );
  }

  return (
    <Router>
      <NotificationProvider>
        <Routes>
          {/* Public / Auth routes */}
          <Route path="/login" element={<AuthWrapper><Login onLogin={handleLogin} /></AuthWrapper>} />
          <Route path="/register" element={<AuthWrapper><Register onLogin={handleLogin} /></AuthWrapper>} />
          <Route path="/forgot-password" element={<AuthWrapper><ForgotPassword /></AuthWrapper>} />
          <Route
            path="/reset-password/:token"
            element={
              <AuthWrapper>
                <ResetPassword onSuccess={() => window.location.href = '/password-reset-success'} />
              </AuthWrapper>
            }
          />
          <Route path="/password-reset-success" element={<AuthWrapper><PasswordResetSuccess /></AuthWrapper>} />

          {/* Protected routes with layout */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard user={user} /></Layout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><Layout><Cards user={user} /></Layout></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Layout><Payments user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><Layout><Security user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
          <Route path="/statements" element={<ProtectedRoute><Layout><Statements user={user} /></Layout></ProtectedRoute>} />
          <Route path="/currency-exchange" element={<ProtectedRoute><Layout><CurrencyExchange user={user} /></Layout></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Layout><Insights user={user} /></Layout></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><Layout><Budget user={user} /></Layout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin-banks" element={<ProtectedRoute adminOnly><Layout><AdminBanks /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly><Layout><Users user={user} /></Layout></ProtectedRoute>} />

          {/* Fallback / root */}
          <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Simple presentational components (can be moved to separate files)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BackendWakeScreen({ message, attempt = null }) {
  return (
    <div className="backend-wake-screen">
      <div className="backend-wake-orb backend-wake-orb-one" />
      <div className="backend-wake-orb backend-wake-orb-two" />
      <div className="backend-wake-card">
        <div className="backend-wake-spinner">
          <span /><span /><span />
        </div>
        <h1>{message}</h1>
        <p>
          {attempt
            ? `Our services are starting up after inactivity. Attempt ${attempt} â€“ reconnecting...`
            : 'Please wait while we initialize your secure session.'}
        </p>
        {attempt && (
          <div className="backend-wake-status">
            Attempt {attempt} â€“ reconnecting automatically
          </div>
        )}
      </div>
    </div>
  );
}

function SessionExpiredScreen({ onClick }) {
  return (
    <div className="session-expired-screen">
      <h2>Your session has expired</h2>
      <p>Please sign in again to continue.</p>
      <button onClick={onClick}>Go to Login</button>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="error-screen">
      <h2>Something went wrong</h2>
      <p>{message || 'Failed to initialize application'}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}

export default App;

