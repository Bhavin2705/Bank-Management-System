import { CreditCard, Eye, EyeOff, Lock, Plus, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';

const Cards = ({ user }) => {
  const { showError } = useNotification();
  const [cards, setCards] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [formData, setFormData] = useState({
    cardType: 'debit',
    cardName: '',
    pin: ''
  });

  useEffect(() => {
    loadCards();
  }, [user.id]);

  const loadCards = () => {
    const userCards = JSON.parse(localStorage.getItem(`cards_${user.id}`) || '[]');
    setCards(userCards);
  };

  const generateCardNumber = () => {
    const prefix = Math.floor(Math.random() * 4) + 1; // 1-4 for different card types
    const number = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${number}`;
  };

  const generateExpiryDate = () => {
    const now = new Date();
    const expiry = new Date(now.getFullYear() + 3, now.getMonth(), 1);
    return expiry.toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      showError('PIN must be exactly 4 digits');
      return;
    }

    const newCard = {
      id: Date.now().toString(),
      cardNumber: generateCardNumber(),
      cardName: formData.cardName || user.name,
      expiryDate: generateExpiryDate(),
      cardType: formData.cardType,
      pin: formData.pin,
      status: 'active',
      balance: user.balance,
      createdAt: new Date().toISOString()
    };

    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    localStorage.setItem(`cards_${user.id}`, JSON.stringify(updatedCards));

    setFormData({ cardType: 'debit', cardName: '', pin: '' });
    setShowAddForm(false);
  };

  const toggleCardVisibility = (cardId) => {
    const newVisible = new Set(visibleCards);
    if (newVisible.has(cardId)) {
      newVisible.delete(cardId);
    } else {
      newVisible.add(cardId);
    }
    setVisibleCards(newVisible);
  };

  const toggleCardLock = (cardId) => {
    const updatedCards = cards.map(card =>
      card.id === cardId
        ? { ...card, status: card.status === 'active' ? 'locked' : 'active' }
        : card
    );
    setCards(updatedCards);
    localStorage.setItem(`cards_${user.id}`, JSON.stringify(updatedCards));
  };

  const formatCardNumber = (number) => {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  if (user.role === 'admin') {
    return (
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Card Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administrators cannot view or manage personal card details.
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          <CreditCard size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <div>Card details are hidden for admin users.</div>
        </div>
      </div>
    );
  }

  // ...existing code for regular users...
  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Card Management
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your debit and credit cards
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{cards.length}</div>
              <div className="stat-label">Total Cards</div>
            </div>
            <CreditCard size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{cards.filter(c => c.status === 'active').length}</div>
              <div className="stat-label">Active Cards</div>
            </div>
            <Unlock size={32} style={{ color: '#28a745' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{cards.filter(c => c.status === 'locked').length}</div>
              <div className="stat-label">Locked Cards</div>
            </div>
            <Lock size={32} style={{ color: '#dc3545' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} />
          {showAddForm ? 'Cancel' : 'Add New Card'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Card</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Card Type</label>
              <select
                name="cardType"
                className="form-input"
                value={formData.cardType}
                onChange={(e) => setFormData({ ...formData, cardType: e.target.value })}
                required
              >
                <option value="debit">Debit Card</option>
                <option value="credit">Credit Card</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Card Name (Optional)</label>
              <input
                type="text"
                name="cardName"
                className="form-input"
                value={formData.cardName}
                onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                placeholder="Enter card name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">4-Digit PIN</label>
              <input
                type="password"
                name="pin"
                className="form-input"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Enter 4-digit PIN"
                maxLength="4"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Create Card
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Your Cards</h3>

        {cards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            <CreditCard size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
            <div>No cards found</div>
            <small>Add your first card to get started</small>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {cards.map((card) => (
              <div key={card.id} className="card-item" style={{
                padding: '1.5rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: card.status === 'locked' ? '#f8f9fa' : 'white',
                opacity: card.status === 'locked' ? 0.7 : 1
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
                        color: card.cardType === 'debit' ? '#1976d2' : '#7b1fa2'
                      }}>
                        {card.cardType.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                      {visibleCards.has(card.id)
                        ? formatCardNumber(card.cardNumber)
                        : `**** **** **** ${card.cardNumber.slice(-4)}`
                      }
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>Expires: {card.expiryDate}</span>
                      <span>Status: <span style={{
                        color: card.status === 'active' ? '#28a745' : '#dc3545',
                        fontWeight: '500'
                      }}>{card.status}</span></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleCardVisibility(card.id)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer'
                      }}
                      title={visibleCards.has(card.id) ? 'Hide card number' : 'Show card number'}
                    >
                      {visibleCards.has(card.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <button
                      onClick={() => toggleCardLock(card.id)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: card.status === 'active' ? '#dc3545' : '#28a745',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      title={card.status === 'active' ? 'Lock card' : 'Unlock card'}
                    >
                      {card.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cards;
