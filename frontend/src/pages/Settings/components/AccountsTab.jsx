import { CreditCard } from 'lucide-react';

const AccountsTab = ({ linkedAccounts, loading, onRefresh, onToggleCardStatus }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
        <CreditCard size={20} />
        Linked Accounts & Cards
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>

    {linkedAccounts && linkedAccounts.length > 0 ? (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {linkedAccounts.map((card) => (
          <div key={card._id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: '600' }}>{card.cardHolder || card.cardName || 'Card'}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  {(card.cardType || 'Credit Card').toUpperCase()} | ******{card.cardNumber?.slice(-4)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Expires: {card.expiryMonth}/{card.expiryYear}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: card.status === 'active' ? '#10b981' : '#ef4444',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    textTransform: 'capitalize'
                  }}
                >
                  {card.status || 'active'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minWidth: 0 }}
                  disabled={loading}
                  onClick={() => onToggleCardStatus(card._id, card.status)}
                >
                  {card.status === 'active' ? 'Lock Card' : 'Unlock Card'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          No linked cards found. Add a card from the Cards section.
        </div>
      </div>
    )}
  </div>
);

export default AccountsTab;
