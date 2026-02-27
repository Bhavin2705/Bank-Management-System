export const popularCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

export const popularPairs = [
  { from: 'USD', to: 'EUR' },
  { from: 'USD', to: 'GBP' },
  { from: 'EUR', to: 'GBP' },
  { from: 'USD', to: 'JPY' },
  { from: 'USD', to: 'CAD' },
  { from: 'EUR', to: 'CHF' },
];

export const MIN_REFRESH_INTERVAL = 10 * 1000;