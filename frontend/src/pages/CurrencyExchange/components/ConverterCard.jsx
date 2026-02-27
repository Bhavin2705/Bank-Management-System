import { ArrowRightLeft, RefreshCw, TrendingUp } from 'lucide-react';

const ConverterCard = ({
  conversion,
  exchangeRates,
  sortedCodes,
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
  <div className="card" style={{ marginBottom: '2rem' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <h3 style={{ margin: 0 }}>Currency Converter</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.6rem',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            background: 'var(--bg-tertiary)',
          }}
        >
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mode:</span>
          <button
            onClick={onToggleMode}
            style={{
              padding: '0.25rem 0.6rem',
              border: '1px solid var(--border)',
              background: useLiveData ? 'var(--text-accent)' : 'var(--bg-secondary)',
              color: useLiveData ? 'white' : 'var(--text-primary)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
            title={useLiveData ? 'Switch to stable data' : 'Switch to live data'}
          >
            {useLiveData ? 'Live' : 'Stable'}
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          disabled={refreshing || refreshDisabled}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={refreshing ? 'rotating' : ''} />
          {refreshing ? 'Refreshing...' : refreshDisabled ? 'Please wait...' : 'Refresh Rates'}
        </button>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <label className="form-label">From</label>
        <select className="form-input" value={conversion.fromCurrency} onChange={(e) => onConversionChange({ fromCurrency: e.target.value })}>
          {sortedCodes.map((code) => (
            <option key={code} value={code}>
              {code} - {getCurrencyInfo(code).name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onSwapCurrencies}
        style={{
          padding: '0.65rem',
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          borderRadius: '50%',
          cursor: 'pointer',
          marginBottom: '0.15rem',
        }}
        title="Swap currencies"
      >
        <ArrowRightLeft size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <label className="form-label">To</label>
        <select className="form-input" value={conversion.toCurrency} onChange={(e) => onConversionChange({ toCurrency: e.target.value })}>
          {sortedCodes.map((code) => (
            <option key={code} value={code}>
              {code} - {getCurrencyInfo(code).name}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div style={{ marginBottom: '2rem' }}>
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
      <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={20} style={{ color: '#28a745' }} />
          <h4 style={{ margin: 0 }}>Conversion Result</h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>From</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(result.originalAmount, result.fromCurrency)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>To</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#28a745' }}>{formatCurrency(result.convertedAmount, result.toCurrency)}</div>
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Exchange Rate: 1 {getCurrencyInfo(result.fromCurrency).symbol} = {result.rate.toFixed(2)} {getCurrencyInfo(result.toCurrency).symbol}
        </div>
      </div>
    )}
  </div>
);

export default ConverterCard;
