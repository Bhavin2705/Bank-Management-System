const KeyRates = ({ popularCurrencies, exchangeRates }) => (
  <>
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ margin: 0, marginBottom: '0.9rem', fontSize: '1.05rem' }}>Key Rates</h3>
    </div>
    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '2rem' }}>
      {popularCurrencies.slice(0, 6).map((currency) => (
        <div key={currency.code} className="stat-card" style={{ padding: '1rem', minHeight: '92px' }}>
          <div className="stat-label" style={{ marginBottom: '0.2rem' }}>
            {currency.code}/USD
          </div>
          <div className="stat-value" style={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
            {exchangeRates[currency.code] ? (1 / exchangeRates[currency.code]).toFixed(2) : 'N/A'}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default KeyRates;