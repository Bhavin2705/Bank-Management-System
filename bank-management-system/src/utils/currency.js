const DEFAULT_CURRENCY = 'INR';
const DEFAULT_BASE_CURRENCY = 'INR';

let exchangeRates = null;

const CURRENCY_LOCALE_MAP = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP'
};

export const resolveUserCurrency = (user) => user?.preferences?.currency || DEFAULT_CURRENCY;

export const resolveCurrencyLocale = (currencyCode) => CURRENCY_LOCALE_MAP[currencyCode] || 'en-US';

export const setExchangeRates = (rates) => {
  exchangeRates = rates && typeof rates === 'object' ? rates : null;
};

export const getExchangeRates = () => exchangeRates;

export const convertAmount = (amount, fromCurrency = DEFAULT_BASE_CURRENCY, toCurrency = DEFAULT_CURRENCY) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return 0;
  if (fromCurrency === toCurrency) return numericAmount;
  if (!exchangeRates || !exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return numericAmount;

  // OpenExchangeRates rates are relative to USD: convert source -> USD -> target.
  const amountInUsd = numericAmount / exchangeRates[fromCurrency];
  return amountInUsd * exchangeRates[toCurrency];
};

export const formatCurrencyByPreference = (amount, user, options = {}) => {
  const currency = options.currency || resolveUserCurrency(user);
  const baseCurrency = options.baseCurrency || DEFAULT_BASE_CURRENCY;
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const shouldConvert = options.convert !== false;
  const canConvert = !shouldConvert
    || currency === baseCurrency
    || !!(exchangeRates && exchangeRates[baseCurrency] && exchangeRates[currency]);

  const displayCurrency = canConvert ? currency : baseCurrency;
  const locale = options.locale || resolveCurrencyLocale(displayCurrency);
  const displayAmount = shouldConvert
    ? (canConvert ? convertAmount(safeAmount, baseCurrency, currency) : safeAmount)
    : safeAmount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: displayCurrency,
    ...(options.minimumFractionDigits !== undefined ? { minimumFractionDigits: options.minimumFractionDigits } : {}),
    ...(options.maximumFractionDigits !== undefined ? { maximumFractionDigits: options.maximumFractionDigits } : {})
  }).format(displayAmount);
};

export default formatCurrencyByPreference;
