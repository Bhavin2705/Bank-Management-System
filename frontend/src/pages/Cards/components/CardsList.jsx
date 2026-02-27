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
    <div style={{ display: 'grid', gap: '1rem' }}>
      {cards.map((card) => {
        const cardId = card.id || card._id;
        return (
          <div key={cardId} className="card-item" style={{
            padding: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: card.status === 'locked' ? '#f8f9fa' : 'white',
            opacity: card.status === 'locked' ? 0.7 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CreditCard size={20} />
                  <span style={{ fontWeight: '500' }}>{card.cardName}</span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: card.cardType === 'debit' ? '#e3f2fd' : '#f3e5f5',
                    color: card.cardType === 'debit' ? '#1976d2' : '#7b1fa2',
                  }}>
                    {card.cardType.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                  {visibleCards.has(cardId)
                    ? formatCardNumber(card.cardNumber)
                    : `**** **** **** ${card.cardNumber.slice(-4)}`}
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                  <span>Expires: {card.expiryDate}</span>
                  <span>Status: <span style={{ color: card.status === 'active' ? '#28a745' : '#dc3545', fontWeight: '500' }}>{card.status}</span></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>CVV:
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

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => toggleCardVisibility(cardId)}
                  style={{ padding: '0.5rem', border: 'none', borderRadius: '4px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                  title={visibleCards.has(cardId) ? 'Hide card number' : 'Show card number'}
                >
                  {visibleCards.has(cardId) ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button
                  onClick={() => toggleCardLock(cardId)}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '4px',
                    background: card.status === 'active' ? '#dc3545' : '#28a745',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                  title={card.status === 'active' ? 'Lock card' : 'Unlock card'}
                >
                  {card.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                </button>

                <button
                  onClick={() => showVirtualCard(cardId)}
                  style={{ padding: '0.5rem 0.6rem', border: 'none', borderRadius: '4px', background: '#1E3A8A', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  title="Open virtual card view"
                >
                  Virtual
                </button>

                <button
                  onClick={() => closeCard(cardId, card.cardNumber)}
                  style={{ padding: '0.5rem', border: 'none', borderRadius: '4px', background: '#6c757d', color: 'white', cursor: 'pointer' }}
                  title="Close card"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardsList;
