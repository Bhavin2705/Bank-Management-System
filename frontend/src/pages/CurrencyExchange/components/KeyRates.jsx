const KeyRates = ({ popularCurrencies, exchangeRates }) => (
  <>
    <div className="currency-keyrates-header">
      <h3 className="currency-keyrates-title">Key Rates</h3>
    </div>
    <div className="dashboard-grid currency-keyrates-grid">
      {popularCurrencies.slice(0, 6).map((currency) => (
        <div key={currency.code} className="stat-card currency-keyrates-card">
          <div className="stat-label currency-keyrates-label">
            {currency.code}/USD
          </div>
          <div className="stat-value currency-keyrates-value">
            {exchangeRates[currency.code] ? (1 / exchangeRates[currency.code]).toFixed(2) : 'N/A'}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default KeyRates;
