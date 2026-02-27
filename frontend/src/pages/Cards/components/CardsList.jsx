import { CreditCard, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

const CardsList = ({
  cards,
  visibleCards,
  visibleCvvs,
  formatCardNumber,
  toggleCardVisibility,
  toggleCardLock,
  toggleCvvVisibility,
  showVirtualCard,
  closeCard,
}) => {
  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        <CreditCard size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
        <div>No cards found</div>
        <small>Add your first card to get started</small>
      </div>
    );
  }

  return (
    <div className="cards-list" style={{ display: 'grid', gap: '1rem' }}>
      {cards.map((card) => {
        const cardId = card.id || card._id;
        return (
          <div key={cardId} className="card-item" style={{
            padding: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: card.status === 'inactive' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
            opacity: card.status === 'inactive' ? 0.78 : 1,
          }}>
            <div className="card-item-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="card-item-content" style={{ flex: 1, minWidth: 0 }}>
                <div className="card-item-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CreditCard size={20} />
                  <span style={{ fontWeight: '500' }}>{card.cardName}</span>
                  <span className={`cards-type-chip ${card.cardType === 'debit' ? 'is-debit' : 'is-credit'}`} style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    {card.cardType.toUpperCase()}
                  </span>
                </div>

                <div className="card-item-number" style={{ fontSize: '1.2rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                  {visibleCards.has(cardId)
                    ? formatCardNumber(card.cardNumber)
                    : `**** **** **** ${card.cardNumber.slice(-4)}`}
                </div>

                <div className="card-item-meta" style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="card-item-meta-value">Expires: {card.expiryDate}</span>
                  <span className="card-item-meta-value">Status: <span style={{ color: card.status === 'active' ? 'var(--success)' : 'var(--error)', fontWeight: '500' }}>{card.status}</span></span>
                  <span className="card-item-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>CVV:
                    <strong style={{ letterSpacing: '2px' }}>{visibleCvvs.has(cardId) ? (card.cvv || '---') : '• • •'}</strong>
                    <button
                      onClick={() => toggleCvvVisibility(cardId)}
                      style={{ border: 'none', background: 'none', padding: 6, marginLeft: 4, cursor: 'pointer' }}
                      title={visibleCvvs.has(cardId) ? 'Hide CVV' : 'Show CVV'}
                    >
                      {visibleCvvs.has(cardId) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </div>
              </div>

              <div className="card-item-actions">
                <div className="card-item-quick-actions">
                  <button
                    onClick={() => toggleCardVisibility(cardId)}
                    className="card-item-action-btn card-item-icon-btn"
                    style={{ padding: '0.5rem', border: 'none', borderRadius: '4px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                    title={visibleCards.has(cardId) ? 'Hide card number' : 'Show card number'}
                  >
                    {visibleCards.has(cardId) ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  <button
                    onClick={() => toggleCardLock(cardId)}
                    className={`card-item-action-btn card-item-icon-btn ${card.status === 'active' ? 'card-lock-btn lock' : 'card-lock-btn unlock'}`}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                    title={card.status === 'active' ? 'Lock card' : 'Unlock card'}
                  >
                    {card.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>

                <div className="card-item-main-actions">
                  <button
                    onClick={() => showVirtualCard(cardId)}
                    className="card-item-action-btn"
                    style={{ padding: '0.5rem 0.6rem', border: 'none', borderRadius: '4px', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    title="Open virtual card view"
                  >
                    Virtual View
                  </button>

                  <button
                    onClick={() => closeCard(cardId, card.cardNumber)}
                    className="card-item-action-btn"
                    style={{ padding: '0.5rem', border: 'none', borderRadius: '4px', background: '#6c757d', color: 'white', cursor: 'pointer' }}
                    title="Close card"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardsList;
