import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import api from '../../utils/api';
import ConfirmModal from '../../components/common/ConfirmModal';
import { CvvPinModal } from '../../shared/components/modals';
import { AddCardForm, AdminCardsAccessNotice, CardsList, CardsStats, VirtualCardModal } from './components';
import { formatCardNumber, generateCardNumber, generateExpiryDate } from './utils';

const initialFormData = {
  cardType: 'debit',
  cardName: '',
  pin: '',
};

const Cards = ({ user }) => {
  const getCardId = (card) => card?.id || card?._id || '';
  const { showError, showSuccess } = useNotification();
  const [cards, setCards] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [visibleCvvs, setVisibleCvvs] = useState(new Set());
  const [formData, setFormData] = useState(initialFormData);
  const [showPin, setShowPin] = useState(false);
  const [modal, setModal] = useState({ open: false });
  const [showCvvPinModal, setShowCvvPinModal] = useState(false);
  const [cvvPin, setCvvPin] = useState('');
  const [cvvPinError, setCvvPinError] = useState('');
  const [cvvPinVerifying, setCvvPinVerifying] = useState(false);
  const [pendingCvvCardId, setPendingCvvCardId] = useState(null);
  const [virtualCardId, setVirtualCardId] = useState(null);

  const loadCards = async () => {
    try {
      const res = await api.cards.getAll();
      if (res?.success) {
        setCards(res.data || []);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
      setCards([]);
    }
  };

  useEffect(() => {
    loadCards();
  }, [user?._id, user?.id]);

  const handleSubmit = async (e) => {
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
      status: 'active',
    };

    try {
      const result = await api.cards.create(newCard);
      if (result.success) {
        await loadCards();
        setFormData(initialFormData);
        setShowAddForm(false);
      } else {
        showError(result.error || 'Failed to create card');
      }
    } catch (err) {
      console.error('Create card error:', err);
      showError(err.message || 'Create card failed');
    }
  };

  const toggleCardVisibility = (cardId) => {
    const updatedVisibleCards = new Set(visibleCards);
    if (updatedVisibleCards.has(cardId)) {
      updatedVisibleCards.delete(cardId);
    } else {
      updatedVisibleCards.add(cardId);
    }
    setVisibleCards(updatedVisibleCards);
  };

  const toggleCvvVisibility = (cardId) => {
    if (visibleCvvs.has(cardId)) {
      const updatedVisibleCvvs = new Set(visibleCvvs);
      updatedVisibleCvvs.delete(cardId);
      setVisibleCvvs(updatedVisibleCvvs);
      return;
    }

    setPendingCvvCardId(cardId);
    setShowCvvPinModal(true);
    setCvvPin('');
    setCvvPinError('');
  };

  const closeCvvPinModal = () => {
    setShowCvvPinModal(false);
    setCvvPin('');
    setCvvPinError('');
    setPendingCvvCardId(null);
  };

  const verifyCvvPin = async () => {
    if (!cvvPin.trim()) {
      setCvvPinError('Please enter your PIN');
      return;
    }

    try {
      setCvvPinVerifying(true);
      setCvvPinError('');
      const result = await api.cards.revealCvv(pendingCvvCardId, { pin: cvvPin });

      if (result?.success) {
        const revealedCvv = result?.data?.cvv;
        if (!revealedCvv) {
          setCvvPinError('Unable to reveal CVV. Please try again.');
          return;
        }

        setCards((prevCards) => (
          prevCards.map((card) => {
            const currentId = getCardId(card);
            if (currentId !== pendingCvvCardId) return card;
            return { ...card, cvv: revealedCvv };
          })
        ));

        const updatedVisibleCvvs = new Set(visibleCvvs);
        updatedVisibleCvvs.add(pendingCvvCardId);
        setVisibleCvvs(updatedVisibleCvvs);
        showSuccess('CVV revealed');
        closeCvvPinModal();
      } else {
        setCvvPinError(result?.error || 'Invalid PIN. Please try again.');
      }
    } catch (error) {
      setCvvPinError(error.message || 'PIN verification failed. Please try again.');
    } finally {
      setCvvPinVerifying(false);
    }
  };

  const toggleCardLock = async (cardId) => {
    const card = cards.find((c) => getCardId(c) === cardId);
    if (!card) return;

    const newStatus = card.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.cards.updateStatus(cardId, { status: newStatus });
      if (res.success) {
        await loadCards();
      }
    } catch (err) {
      console.error('Toggle lock error:', err);
      showError(err.message || 'Failed to update card status');
    }
  };

  const closeCard = (cardId, cardNumber) => {
    const last4 = cardNumber ? String(cardNumber).slice(-4) : '----';
    setModal({
      open: true,
      cardId,
      title: 'Close Card',
      message: `Are you sure you want to close the card ending with ${last4}? This will remove it from your cards list.`,
      confirmText: 'Close',
      cancelText: 'Cancel',
    });
  };

  const openVirtualCard = (cardId) => {
    setVirtualCardId(cardId);
  };

  const closeVirtualCard = () => {
    setVirtualCardId(null);
  };

  const selectedVirtualCard = cards.find((card) => getCardId(card) === virtualCardId) || null;

  const handleModalConfirm = async () => {
    if (!modal.cardId) {
      setModal({ open: false });
      return;
    }

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

  if (user.role === 'admin') {
    return <AdminCardsAccessNotice />;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Card Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your debit and credit cards</p>
      </div>

      <CardsStats cards={cards} />

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
        <AddCardForm
          formData={formData}
          setFormData={setFormData}
          showPin={showPin}
          setShowPin={setShowPin}
          handleSubmit={handleSubmit}
        />
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Your Cards</h3>
        <CardsList
          cards={cards}
          visibleCards={visibleCards}
          visibleCvvs={visibleCvvs}
          formatCardNumber={formatCardNumber}
          toggleCardVisibility={toggleCardVisibility}
          toggleCardLock={toggleCardLock}
          toggleCvvVisibility={toggleCvvVisibility}
          showVirtualCard={openVirtualCard}
          closeCard={closeCard}
        />
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onCancel={handleModalCancel}
        onConfirm={handleModalConfirm}
      />
      <CvvPinModal
        show={showCvvPinModal}
        cvvPin={cvvPin}
        cvvPinError={cvvPinError}
        cvvPinVerifying={cvvPinVerifying}
        setCvvPin={setCvvPin}
        onClose={closeCvvPinModal}
        onVerify={verifyCvvPin}
      />
      <VirtualCardModal
        show={!!selectedVirtualCard}
        card={selectedVirtualCard}
        cardNumberVisible={selectedVirtualCard ? visibleCards.has(getCardId(selectedVirtualCard)) : false}
        cvvVisible={selectedVirtualCard ? visibleCvvs.has(getCardId(selectedVirtualCard)) : false}
        onToggleCardNumber={() => selectedVirtualCard && toggleCardVisibility(getCardId(selectedVirtualCard))}
        onToggleCvv={() => selectedVirtualCard && toggleCvvVisibility(getCardId(selectedVirtualCard))}
        onClose={closeVirtualCard}
      />
    </div>
  );
};

export default Cards;



