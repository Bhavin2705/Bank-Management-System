export const generateCardNumber = () => {
  const prefix = Math.floor(Math.random() * 4) + 1;
  const number = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}${number}`;
};

export const generateExpiryDate = () => {
  const now = new Date();
  const expiry = new Date(now.getFullYear() + 3, now.getMonth(), 1);
  return expiry.toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' });
};

export const formatCardNumber = (number) => number.replace(/(\d{4})(?=\d)/g, '$1 ');