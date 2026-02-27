export const getCurrencyInfo = (code, popularCurrencies) =>
  popularCurrencies.find((currency) => currency.code === code) || { name: code, symbol: code };

export const formatCurrency = (amount, currencyCode, popularCurrencies) => {
  const currency = popularCurrencies.find((item) => item.code === currencyCode);
  const symbol = currency ? currency.symbol : currencyCode;

  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  switch (currencyCode) {
    case 'EUR':
    case 'CHF':
      return `${formattedNumber} ${symbol}`;
    case 'BRL':
      return `${symbol} ${formattedNumber}`;
    default:
      return `${symbol}${formattedNumber}`;
  }
};