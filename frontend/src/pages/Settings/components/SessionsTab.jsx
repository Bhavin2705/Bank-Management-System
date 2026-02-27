import { Clock } from 'lucide-react';

const SessionsTab = ({ sessions, loading, onRefresh }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={20} />
        Account & Session Information
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>

    {sessions ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Created</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{new Date(sessions.accountCreated).toLocaleDateString()}</div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Age</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{sessions.accountAge} days</div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Login</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
            {sessions.lastLogin ? new Date(sessions.lastLogin).toLocaleDateString() : 'First login'}
          </div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Current Session</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
            {sessions.currentSession ? new Date(sessions.currentSession).toLocaleString() : 'Active Now'}
          </div>
        </div>
      </div>
    ) : (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {loading ? 'Loading session information...' : 'No session data available.'}
        </div>
      </div>
    )}
  </div>
);

export default SessionsTab;
