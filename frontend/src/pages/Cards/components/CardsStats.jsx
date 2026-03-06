import { CreditCard, Lock, Unlock } from 'lucide-react';

const CardsStats = ({ cards }) => (
  <div className="dashboard-grid cards-stats-grid">
    <div className="stat-card">
      <div className="cards-stats-row">
        <div>
          <div className="stat-value">{cards.length}</div>
          <div className="stat-label">Total Cards</div>
        </div>
        <CreditCard size={32} className="cards-stats-icon cards-stats-icon-total" />
      </div>
    </div>

    <div className="stat-card">
      <div className="cards-stats-row">
        <div>
          <div className="stat-value">{cards.filter((c) => c.status === 'active').length}</div>
          <div className="stat-label">Active Cards</div>
        </div>
        <Unlock size={32} className="cards-stats-icon cards-stats-icon-active" />
      </div>
    </div>

    <div className="stat-card">
      <div className="cards-stats-row">
        <div>
          <div className="stat-value">{cards.filter((c) => ['inactive', 'blocked', 'lost', 'expired'].includes(c.status)).length}</div>
          <div className="stat-label">Locked Cards</div>
        </div>
        <Lock size={32} className="cards-stats-icon cards-stats-icon-locked" />
      </div>
    </div>
  </div>
);

export default CardsStats;
