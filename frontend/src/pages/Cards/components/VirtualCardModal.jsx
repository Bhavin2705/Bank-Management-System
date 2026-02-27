import { CreditCard, Wifi, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const formatCard = (cardNumber = '') => {
  const digits = String(cardNumber).replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const getLast4 = (cardNumber = '') => String(cardNumber).slice(-4);

const buildMasked = (cardNumber = '', revealed = false) => {
  if (revealed) return formatCard(cardNumber);
  const last4 = getLast4(cardNumber);
  return `**** **** **** ${last4}`;
};

const brandLabel = (card) => {
  if (card?.cardBrand) return String(card.cardBrand).toUpperCase();
  if (card?.cardType === 'credit') return 'MASTERCARD';
  return 'VISA';
};

export default function VirtualCardModal({
  show,
  card,
  cardNumberVisible,
  cvvVisible,
  onToggleCardNumber,
  onToggleCvv,
  onClose,
}) {
  const [showBack, setShowBack] = useState(false);

  const cardTheme = useMemo(() => {
    if ((card?.cardType || '').toLowerCase() === 'credit') {
      return 'linear-gradient(135deg, #1f2937 0%, #111827 45%, #4b5563 100%)';
    }
    return 'linear-gradient(135deg, #0A1F44 0%, #1E3A8A 50%, #00D4FF 100%)';
  }, [card?.cardType]);

  if (!show || !card) return null;

  return (
    <div className="virtual-card-overlay" role="dialog" aria-modal="true" aria-label="Virtual card preview">
      <div className="virtual-card-modal card">
        <div className="virtual-card-modal-header">
          <h3>Virtual Card Preview</h3>
          <button type="button" className="virtual-card-close" onClick={onClose} aria-label="Close virtual card preview">
            <X size={18} />
          </button>
        </div>

        <div className="virtual-card-stage">
          <div className={`virtual-card-face ${showBack ? 'is-back' : ''}`} style={{ background: cardTheme }}>
            {!showBack ? (
              <>
                <div className="virtual-card-top-row">
                  <span className="virtual-card-bank">BankPro</span>
                  <Wifi size={18} className="virtual-card-wifi" />
                </div>
                <div className="virtual-card-chip" />
                <div className="virtual-card-number">{buildMasked(card.cardNumber, cardNumberVisible)}</div>
                <div className="virtual-card-bottom-row">
                  <div>
                    <div className="virtual-card-label">Card Holder</div>
                    <div className="virtual-card-value">{card.cardName || 'Card Holder'}</div>
                  </div>
                  <div>
                    <div className="virtual-card-label">Expires</div>
                    <div className="virtual-card-value">{card.expiryDate}</div>
                  </div>
                  <div className="virtual-card-brand">{brandLabel(card)}</div>
                </div>
              </>
            ) : (
              <>
                <div className="virtual-card-strip" />
                <div className="virtual-card-signature-row">
                  <div className="virtual-card-signature" />
                  <div className="virtual-card-cvv">{cvvVisible ? (card.cvv || '---') : '•••'}</div>
                </div>
                <div className="virtual-card-back-note">
                  This virtual card is for secure online purchases only.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="virtual-card-controls">
          <button type="button" className="btn btn-secondary" onClick={() => setShowBack((prev) => !prev)}>
            {showBack ? 'Show Front' : 'Show Back'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onToggleCardNumber}>
            {cardNumberVisible ? 'Hide Number' : 'Show Number'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onToggleCvv}>
            {cvvVisible ? 'Hide CVV' : 'Show CVV'}
          </button>
        </div>

        <div className="virtual-card-meta">
          <span><CreditCard size={14} /> {card.cardType?.toUpperCase() || 'CARD'}</span>
          <span>Status: {card.status}</span>
        </div>
      </div>
    </div>
  );
}
