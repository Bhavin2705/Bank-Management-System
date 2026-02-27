export const BANKPRO_BANK = { id: 'bankpro', name: 'BankPro', ifscCode: 'BANK0001234' };

export const createInitialTransferForm = () => ({
  transferMethod: 'phone',
  recipientPhone: '',
  recipientAccount: '',
  recipientName: '',
  recipientBank: { ...BANKPRO_BANK },
  amount: '',
  description: ''
});

export const isExternalBank = (recipientBank) => (
  recipientBank && recipientBank.id !== 'bankpro'
);

export const calculateExternalTransferFee = (amount) => (
  Math.max(10, amount * 0.005)
);

export const getTransferValidationError = (formData, userBalance) => {
  const amount = parseFloat(formData.amount);
  if (!amount || amount <= 0) return 'Amount must be greater than 0';
  if (amount > userBalance) return 'Insufficient balance';

  const externalTransfer = isExternalBank(formData.recipientBank);

  if (formData.transferMethod === 'phone') {
    if (!formData.recipientPhone || !/^\d{10}$/.test(formData.recipientPhone)) {
      return 'Please enter a valid 10-digit phone number';
    }
  } else if (!formData.recipientAccount) {
    return 'Please enter a valid account number';
  }

  if (externalTransfer && (!formData.recipientName || !formData.recipientBank?.name)) {
    return 'Recipient name and bank is required for external transfers';
  }

  return '';
};

export const buildTransferPayload = (formData) => {
  const amount = parseFloat(formData.amount);
  const externalTransfer = isExternalBank(formData.recipientBank);
  const basePayload = {
    amount,
    description: formData.description || 'Money transfer'
  };

  if (formData.transferMethod === 'phone') {
    basePayload.recipientPhone = formData.recipientPhone;
  } else {
    basePayload.recipientAccount = formData.recipientAccount;
  }

  if (externalTransfer) {
    basePayload.recipientName = formData.recipientName;
    basePayload.recipientBank = {
      bankName: formData.recipientBank.name,
      branchName: formData.recipientBank.branchName || ''
    };
  }

  return basePayload;
};
