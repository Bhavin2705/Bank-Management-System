const ConfirmModal = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-card" role="dialog" aria-modal="true" aria-label={title || 'Confirmation dialog'}>
        <h3 className="confirm-modal-title">{title}</h3>
        <div className="confirm-modal-message">{message}</div>
        <div className="confirm-modal-actions">
          <button onClick={onCancel} className="confirm-modal-btn confirm-modal-btn-cancel">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="confirm-modal-btn confirm-modal-btn-confirm">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
