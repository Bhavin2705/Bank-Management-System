import { Bell, Building2, Clock, CreditCard, Lock, User } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Bell },
  { id: 'accounts', label: 'Accounts', icon: CreditCard },
  { id: 'sessions', label: 'Sessions', icon: Clock }
];

const SettingsTabs = ({ activeTab, setActiveTab }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap' }}>
    {tabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`btn ${activeTab === id ? 'btn-primary' : 'btn-secondary'}`}
        style={{
          marginRight: id === 'sessions' ? 0 : '1rem',
          borderRadius: '8px 8px 0 0',
          marginBottom: '0.5rem'
        }}
      >
        {Icon ? <Icon size={16} /> : null}
        {label}
      </button>
    ))}
  </div>
);

export default SettingsTabs;
