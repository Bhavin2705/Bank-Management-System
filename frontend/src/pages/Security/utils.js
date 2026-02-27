export const SECURITY_QUESTIONS = [
  "What was your first pet's name?",
  'What city were you born in?',
  'What was your first car?',
  "What is your mother's maiden name?"
];

export const INITIAL_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export const INITIAL_PIN_FORM = {
  currentPin: '',
  newPin: '',
  confirmPin: ''
};

export const INITIAL_SECURITY_QUESTIONS_FORM = {
  question1: '',
  answer1: '',
  question2: '',
  answer2: ''
};

export const validatePasswordForm = (passwordForm) => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    return 'New passwords do not match';
  }

  if (passwordForm.newPassword.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  return '';
};

export const validatePinForm = ({ selectedCardId, cards, pinForm }) => {
  if (!selectedCardId) {
    return 'Please select a card to change its PIN.';
  }

  const targetCard = cards.find((card) => String(card._id || card.id) === selectedCardId);
  if (targetCard && targetCard.status !== 'active') {
    return 'The selected card is not active. Activate the card before changing its PIN.';
  }

  if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
    return 'PIN must be exactly 4 digits';
  }

  if (pinForm.newPin !== pinForm.confirmPin) {
    return 'New PINs do not match';
  }

  return '';
};

export const getRecentLoginHistory = (clientDataState) => {
  const history = clientDataState.loginHistory || [];
  return history.slice(-10);
};
