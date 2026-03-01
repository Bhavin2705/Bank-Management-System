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
    <div className="cvv-pin-modal-overlay">
      <div className="cvv-pin-modal">
        <h2 className="cvv-pin-modal-title">Verify Account PIN</h2>
        <p className="cvv-pin-modal-subtitle">Enter your account PIN to reveal the CVV</p>

        {cvvPinError && (
          <div className="cvv-pin-modal-error">
            {cvvPinError}
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          value={cvvPin}
          onChange={(e) => setCvvPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="Enter 4-6 digit account PIN"
          pattern="[0-9]{4,6}"
          autoComplete="off"
          className="cvv-pin-modal-input"
          autoFocus
        />

        <div className="cvv-pin-modal-actions">
          <button
            onClick={onClose}
            className="cvv-pin-btn cvv-pin-btn-cancel"
            disabled={cvvPinVerifying}
          >
            Cancel
          </button>
          <button
            onClick={onVerify}
            className="cvv-pin-btn cvv-pin-btn-confirm"
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
