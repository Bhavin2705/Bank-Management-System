import { Calculator as CalcIcon, DollarSign } from 'lucide-react';
import { useState } from 'react';

const Calculator = () => {
  const [loanData, setLoanData] = useState({
    principal: '',
    interestRate: '',
    loanTerm: '',
    termType: 'years'
  });
  const [result, setResult] = useState(null);

  const calculateLoan = () => {
    const principal = parseFloat(loanData.principal);
    const annualRate = parseFloat(loanData.interestRate) / 100;
    const term = parseFloat(loanData.loanTerm);

    if (!principal || !annualRate || !term) return;

    const months = loanData.termType === 'years' ? term * 12 : term;
    const monthlyRate = annualRate / 12;

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - principal;

    setResult({
      monthlyPayment,
      totalPayment,
      totalInterest
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleChange = (e) => {
    setLoanData({
      ...loanData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Loan Calculator
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Calculate your loan payments and interest
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalcIcon size={20} />
            Loan Details
          </h3>

          <div className="form-group">
            <label className="form-label">Loan Amount</label>
            <input
              type="number"
              name="principal"
              className="form-input"
              value={loanData.principal}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Annual Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              name="interestRate"
              className="form-input"
              value={loanData.interestRate}
              onChange={handleChange}
              placeholder="5.5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Loan Term</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                name="loanTerm"
                className="form-input"
                value={loanData.loanTerm}
                onChange={handleChange}
                placeholder="30"
                style={{ flex: 1 }}
              />
              <select
                name="termType"
                className="form-input"
                value={loanData.termType}
                onChange={handleChange}
                style={{ width: '120px' }}
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <button onClick={calculateLoan} className="btn btn-primary" style={{ width: '100%' }}>
            Calculate Payment
          </button>
        </div>

        {result && (
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} />
              Payment Summary
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="stat-card" style={{ margin: 0 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-accent)', marginBottom: '0.5rem' }}>
                  {formatCurrency(result.monthlyPayment)}
                </div>
                <div className="stat-label">Monthly Payment</div>
              </div>

              <div className="stat-card" style={{ margin: 0 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)', marginBottom: '0.5rem' }}>
                  {formatCurrency(result.totalPayment)}
                </div>
                <div className="stat-label">Total Payment</div>
              </div>

              <div className="stat-card" style={{ margin: 0 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--error)', marginBottom: '0.5rem' }}>
                  {formatCurrency(result.totalInterest)}
                </div>
                <div className="stat-label">Total Interest</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator;
