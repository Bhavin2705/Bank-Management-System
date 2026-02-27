export const generateCardNumber = () => {
  const prefix = Math.floor(Math.random() * 4) + 1;
  const number = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}${number}`;
};

export const generateExpiryDate = () => {
  const now = new Date();
  const monthsAhead = Math.floor(Math.random() * 25) + 36; // 3 to 5 years
  const expiry = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const month = String(expiry.getMonth() + 1).padStart(2, '0');
  const year = String(expiry.getFullYear());
  return `${month}/${year}`;
};

export const formatCardNumber = (number) => number.replace(/(\d{4})(?=\d)/g, '$1 ');
