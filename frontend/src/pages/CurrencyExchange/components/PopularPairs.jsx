const PopularPairs = ({ popularPairs, exchangeRates, getCurrencyInfo }) => (
  <div className="card">
    <h3 style={{ marginBottom: '1.5rem' }}>Popular Currency Pairs</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
      {popularPairs.map((pair) => {
        const rate = exchangeRates[pair.to] / exchangeRates[pair.from];
        return (
          <div key={`${pair.from}-${pair.to}`} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>{pair.from}/{pair.to}</span>
              <span style={{ color: '#28a745', fontWeight: 700 }}>{rate ? rate.toFixed(2) : 'N/A'}</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              1 {getCurrencyInfo(pair.from).symbol} = {rate ? rate.toFixed(2) : 'N/A'} {getCurrencyInfo(pair.to).symbol}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PopularPairs;
