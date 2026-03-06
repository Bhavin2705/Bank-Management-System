import { ArrowRightLeft, RefreshCw, TrendingUp } from 'lucide-react';

const ConverterCard = ({
  conversion,
  selectableCodes,
  useLiveData,
  result,
  refreshing,
  refreshDisabled,
  onToggleMode,
  onRefresh,
  onSwapCurrencies,
  onConversionChange,
  getCurrencyInfo,
  formatCurrency,
}) => (
  <div className="card currency-converter-card">
    <div className="currency-converter-header">
      <h3 className="currency-converter-title">Currency Converter</h3>
      <div className="currency-converter-actions">
        <div className="currency-mode-wrap">
          <span className="currency-mode-label">Mode:</span>
          <button
            onClick={onToggleMode}
            className={`currency-mode-btn ${useLiveData ? 'is-live' : 'is-stable'}`}
            title={useLiveData ? 'Switch to stable data' : 'Switch to live data'}
          >
            {useLiveData ? 'Live' : 'Stable'}
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          disabled={refreshing || refreshDisabled}
          
        >
          <RefreshCw size={16} className={refreshing ? 'rotating' : ''} />
          {refreshing ? 'Refreshing...' : refreshDisabled ? 'Please wait...' : 'Refresh Rates'}
        </button>
      </div>
    </div>

    <div className="currency-converter-row">
      <div className="currency-select-col">
        <label className="form-label">From</label>
        <select className="form-input" value={conversion.fromCurrency} onChange={(e) => onConversionChange({ fromCurrency: e.target.value })}>
          {selectableCodes.map((code) => (
            <option key={code} value={code}>
              {code} - {getCurrencyInfo(code).name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onSwapCurrencies}
        className="currency-swap-btn"
        title="Swap currencies"
      >
        <ArrowRightLeft size={20} />
      </button>

      <div className="currency-select-col">
        <label className="form-label">To</label>
        <select className="form-input" value={conversion.toCurrency} onChange={(e) => onConversionChange({ toCurrency: e.target.value })}>
          {selectableCodes.map((code) => (
            <option key={code} value={code}>
              {code} - {getCurrencyInfo(code).name}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="currency-amount-wrap">
      <label className="form-label">Amount</label>
      <input
        type="number"
        className="form-input"
        value={conversion.amount}
        onChange={(e) => onConversionChange({ amount: e.target.value })}
        min="0"
        step="0.01"
        placeholder="Enter amount"
      />
    </div>

    {result && (
      <div className="currency-result-card">
        <div className="currency-result-header">
          <TrendingUp size={20} className="currency-result-icon" />
          <h4 className="currency-result-title">Conversion Result</h4>
        </div>

        <div className="currency-result-grid">
          <div>
            <div className="currency-result-label">From</div>
            <div className="currency-result-value">{formatCurrency(result.originalAmount, result.fromCurrency)}</div>
          </div>
          <div>
            <div className="currency-result-label">To</div>
            <div className="currency-result-value currency-result-value-converted">{formatCurrency(result.convertedAmount, result.toCurrency)}</div>
          </div>
        </div>

        <div className="currency-rate-text">
          Exchange Rate: 1 {getCurrencyInfo(result.fromCurrency).symbol} = {result.rate.toFixed(2)} {getCurrencyInfo(result.toCurrency).symbol}
        </div>
      </div>
    )}
  </div>
);

export default ConverterCard;
