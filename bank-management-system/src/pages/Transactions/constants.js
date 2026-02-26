export const TABS = ['all', 'deposit', 'withdraw', 'transfer'];
export const ACTION_TYPES = ['deposit', 'withdraw', 'transfer'];

export const createInitialFormData = () => ({
  amount: '',
  description: '',
});

export const createInitialTransferData = () => ({
  transferMethod: 'phone',
  recipientPhone: '',
  recipientAccount: '',
  recipientName: '',
  recipientBank: { id: 'bankpro', name: 'BankPro' },
  description: '',
});
