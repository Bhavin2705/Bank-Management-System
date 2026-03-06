const PopularPairs = ({ popularPairs, exchangeRates, getCurrencyInfo }) => (
  <div className="card">
    <h3 className="currency-pairs-title">Popular Currency Pairs</h3>
    <div className="currency-pairs-grid">
      {popularPairs.map((pair) => {
        const rate = exchangeRates[pair.to] / exchangeRates[pair.from];
        return (
          <div key={`${pair.from}-${pair.to}`} className="currency-pair-card">
            <div className="currency-pair-row">
              <span className="currency-pair-code">{pair.from}/{pair.to}</span>
              <span className="currency-pair-rate">{rate ? rate.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="currency-pair-meta">
              1 {getCurrencyInfo(pair.from).symbol} = {rate ? rate.toFixed(2) : 'N/A'} {getCurrencyInfo(pair.to).symbol}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PopularPairs;
