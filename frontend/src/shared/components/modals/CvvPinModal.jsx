const CvvPinModal = ({
  show,
  cvvPin,
  cvvPinError,
  cvvPinVerifying,
  setCvvPin,
  onClose,
  onVerify,
}) => {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1700,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Verify PIN</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Enter your PIN to reveal the CVV</p>

        {cvvPinError && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            {cvvPinError}
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          value={cvvPin}
          onChange={(e) => setCvvPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="Enter 4-6 digit PIN"
          pattern="[0-9]{4,6}"
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '1rem',
            letterSpacing: '0.2em',
          }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
            disabled={cvvPinVerifying}
          >
            Cancel
          </button>
          <button
            onClick={onVerify}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#667eea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: cvvPinVerifying || !cvvPin.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              opacity: cvvPinVerifying || !cvvPin.trim() ? 0.6 : 1,
            }}
            disabled={!cvvPin.trim() || cvvPinVerifying}
          >
            {cvvPinVerifying ? 'Verifying...' : 'Reveal CVV'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CvvPinModal;
