import { CreditCard } from 'lucide-react';

const AdminCardsAccessNotice = () => (
  <div className="container">
    <div style={{ marginBottom: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Card Management</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Administrators cannot view or manage personal card details.</p>
    </div>
    <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
      <CreditCard size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
      <div>Card details are hidden for admin users.</div>
    </div>
  </div>
);

export default AdminCardsAccessNotice;