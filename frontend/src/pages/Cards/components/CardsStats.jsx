import { CreditCard, Lock, Unlock } from 'lucide-react';

const CardsStats = ({ cards }) => (
  <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-value">{cards.length}</div>
          <div className="stat-label">Total Cards</div>
        </div>
        <CreditCard size={32} style={{ color: '#1E3A8A' }} />
      </div>
    </div>

    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-value">{cards.filter((c) => c.status === 'active').length}</div>
          <div className="stat-label">Active Cards</div>
        </div>
        <Unlock size={32} style={{ color: '#28a745' }} />
      </div>
    </div>

    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-value">{cards.filter((c) => ['inactive', 'blocked', 'lost', 'expired'].includes(c.status)).length}</div>
          <div className="stat-label">Locked Cards</div>
        </div>
        <Lock size={32} style={{ color: '#dc3545' }} />
      </div>
    </div>
  </div>
);

export default CardsStats;
