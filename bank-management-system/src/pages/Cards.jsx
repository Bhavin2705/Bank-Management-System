import { CreditCard, Eye, EyeOff, Lock, Plus, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import api from '../utils/api';

const Cards = ({ user }) => {
  const { showError } = useNotification();
  const [cards, setCards] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [visibleCvvs, setVisibleCvvs] = useState(new Set());
  const [formData, setFormData] = useState({
    cardType: 'debit',
    cardName: '',
    pin: ''
  });
  const [showPin, setShowPin] = useState(false);
  const [oneTimeCvv, setOneTimeCvv] = useState(null);
  const [showCvvModal, setShowCvvModal] = useState(false);
  const [modal, setModal] = useState({ open: false });

  const loadCards = () => {
    api.cards.getAll()
      .then((res) => {
        if (res && res.success) setCards(res.data || []);
      })
      .catch((err) => {
        console.error('Error loading cards:', err);
        setCards([]);
      });
  };

  useEffect(() => {
    loadCards();
  }, [user.id]);

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

    if (!formData.cardName || formData.cardName.trim().length === 0) {
      showError('Card name is required');
      return;
    }

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      showError('PIN must be exactly 4 digits');
      return;
    }

    const newCard = {
      id: Date.now().toString(),
      cardNumber: generateCardNumber(),
      cardName: formData.cardName,
      expiryDate: generateExpiryDate(),
      cardType: formData.cardType,
      cardBrand: formData.cardType === 'debit' ? 'visa' : 'mastercard',
      pin: formData.pin,
      status: 'active'
    };

    api.cards.create(newCard)
      .then((result) => {
        if (result.success) {
          // reload cards
          loadCards();
          setFormData({ cardType: 'debit', cardName: '', pin: '' });
          setShowAddForm(false);
          // show one-time CVV if provided by server
          if (result.oneTimeCvv) {
            setOneTimeCvv(result.oneTimeCvv);
            setShowCvvModal(true);
          }
        } else {
          showError(result.error || 'Failed to create card');
        }
      })
      .catch((err) => {
        console.error('Create card error:', err);
        showError(err.message || 'Create card failed');
      });
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

  const toggleCvvVisibility = (cardId) => {
    const newVisible = new Set(visibleCvvs);
    if (newVisible.has(cardId)) {
      newVisible.delete(cardId);
    } else {
      newVisible.add(cardId);
    }
    setVisibleCvvs(newVisible);
  };

  const toggleCardLock = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newStatus = card.status === 'active' ? 'locked' : 'active';
    api.cards.updateStatus(cardId, { status: newStatus })
      .then((res) => {
        if (res.success) loadCards();
      })
      .catch((err) => {
        console.error('Toggle lock error:', err);
        showError(err.message || 'Failed to update card status');
      });
  };

  const closeCard = (cardId, cardNumber) => {
    const last4 = cardNumber ? String(cardNumber).slice(-4) : '----';
    setModal({
      open: true,
      cardId,
      title: 'Close Card',
      message: `Are you sure you want to close the card ending with ${last4}? This will remove it from your cards list.`,
      confirmText: 'Close',
      cancelText: 'Cancel'
    });
  };

  const handleModalConfirm = async () => {
    if (!modal.cardId) return setModal({ open: false });
    try {
      const res = await api.cards.updateStatus(modal.cardId, { status: 'closed' });
      if (res.success) {
        setModal({ open: false });
        await loadCards();
      } else {
        showError(res.error || 'Failed to close card');
        setModal({ open: false });
      }
    } catch (err) {
      console.error('Close card error:', err);
      showError(err.message || 'Failed to close card');
      setModal({ open: false });
    }
  };

  const handleModalCancel = () => {
    setModal({ open: false });
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
              <label className="form-label">Card Name</label>
              <input
                type="text"
                name="cardName"
                className="form-input"
                value={formData.cardName}
                onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                placeholder="Enter card name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">4-Digit PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  name="pin"
                  className="form-input"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="Enter 4-digit PIN"
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                      <span>Expires: {card.expiryDate}</span>
                      <span>Status: <span style={{
                        color: card.status === 'active' ? '#28a745' : '#dc3545',
                        fontWeight: '500'
                      }}>{card.status}</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>CVV:
                        <strong style={{ letterSpacing: '2px' }}>{visibleCvvs.has(card.id) ? (card.cvv || '---') : '• • •'}</strong>
                        <button
                          onClick={() => toggleCvvVisibility(card.id)}
                          style={{
                            border: 'none', background: 'none', padding: 6, marginLeft: 4, cursor: 'pointer'
                          }}
                          title={visibleCvvs.has(card.id) ? 'Hide CVV' : 'Show CVV'}
                        >
                          {visibleCvvs.has(card.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </span>
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
                    <button
                      onClick={() => closeCard(card.id, card.cardNumber)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#6c757d',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      title="Close card"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* One-time CVV modal */}
      {showCvvModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowCvvModal(false)}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 8, minWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '.5rem' }}>Card created</h3>
            <p style={{ marginBottom: '1rem' }}>This is the one-time CVV. It will not be shown again.</p>
            <div style={{ fontSize: '1.5rem', letterSpacing: '4px', fontWeight: 700, textAlign: 'center', marginBottom: '1rem' }}>{oneTimeCvv}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(oneTimeCvv || ''); setShowCvvModal(false); }}>Copy</button>
              <button className="btn btn-primary" onClick={() => setShowCvvModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal for close card */}
      {modal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginBottom: 12 }}>{modal.title}</h3>
            <div style={{ marginBottom: 18 }}>{modal.message}</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={handleModalCancel} style={{ background: '#e9ecef', color: '#333', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>{modal.cancelText || 'Cancel'}</button>
              <button onClick={handleModalConfirm} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>{modal.confirmText || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cards;
