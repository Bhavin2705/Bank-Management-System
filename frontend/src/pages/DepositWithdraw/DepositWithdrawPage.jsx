import { ArrowDownCircle, ArrowUpCircle, CreditCard, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../../components/providers';
import { api } from '../../utils/api';
import { formatCurrencyByPreference } from '../../utils/currency';

const DepositWithdraw = ({ user, onUserUpdate }) => {
    const { showError, showSuccess } = useNotification();
    const [activeTab, setActiveTab] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');

    const handleDeposit = async (e) => {
        e.preventDefault();

        const depositAmount = parseFloat(amount);
        if (depositAmount <= 0) {
            showError('Deposit amount must be greater than 0');
            return;
        }

        if (!pin.trim()) {
            setPinError('Please enter your PIN');
            return;
        }

        try {
            setLoading(true);
            setPinError('');
            console.log('Starting PIN verification...', { pin: '****' });
            const result = await api.users.verifyPin(pin);
            console.log('PIN verification response:', result);

            if (result && result.success) {
                console.log('PIN verified successfully, processing transaction...');
                const transactionData = {
                    type: 'credit',
                    amount: depositAmount,
                    description: description || 'Cash Deposit',
                    category: 'deposit',
                    cardId: null
                };

                try {
                    console.log('Creating transaction with data:', transactionData);
                    const txResult = await api.transactions.create(transactionData);
                    
                    console.log('Transaction API response:', txResult);

                    if (txResult && txResult.success && txResult.data) {
                        const successMsg = `Successfully deposited ${formatCurrency(depositAmount)}`;
                        console.log('Transaction successful:', successMsg);
                        showSuccess(successMsg);

                        const newBalance = user.balance + depositAmount;
                        onUserUpdate({ ...user, balance: newBalance });

                        localStorage.setItem('pinRequiredForTransactions', 'true');

                        setAmount('');
                        setDescription('');
                        setPin('');
                    } else {
                        const errorMsg = txResult?.error || 'Transaction failed - no response data';
                        console.error('Transaction failed:', { txResult, errorMsg });
                        showError(errorMsg);
                    }
                } catch (error) {
                    console.error('Transaction error details:', { 
                        message: error.message, 
                        status: error.status,
                        data: error.data,
                        fullError: error 
                    });
                    showError(error.message || 'Transaction failed. Please try again.');
                }
            } else {
                setPinError(result?.error || 'Invalid PIN. Please try again.');
                console.error('PIN verification failed:', result?.error);
            }
        } catch (error) {
            setPinError(error.message || 'PIN verification failed. Please try again.');
            console.error('PIN verification error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();

        const withdrawAmount = parseFloat(amount);
        if (withdrawAmount <= 0) {
            showError('Withdrawal amount must be greater than 0');
            return;
        }

        if (withdrawAmount > user.balance) {
            showError('Insufficient balance');
            return;
        }

        if (!pin.trim()) {
            setPinError('Please enter your PIN');
            return;
        }

        try {
            setLoading(true);
            setPinError('');
            console.log('Starting PIN verification...', { pin: '****' });
            const result = await api.users.verifyPin(pin);
            console.log('PIN verification response:', result);

            if (result && result.success) {
                console.log('PIN verified successfully, processing transaction...');
                const transactionData = {
                    type: 'debit',
                    amount: withdrawAmount,
                    description: description || 'Cash Withdrawal',
                    category: 'withdrawal',
                    cardId: null
                };

                try {
                    console.log('Creating transaction with data:', transactionData);
                    const txResult = await api.transactions.create(transactionData);
                    
                    console.log('Transaction API response:', txResult);

                    if (txResult && txResult.success && txResult.data) {
                        const successMsg = `Successfully withdrew ${formatCurrency(withdrawAmount)}`;
                        console.log('Transaction successful:', successMsg);
                        showSuccess(successMsg);

                        const newBalance = user.balance - withdrawAmount;
                        onUserUpdate({ ...user, balance: newBalance });

                        localStorage.setItem('pinRequiredForTransactions', 'true');

                        setAmount('');
                        setDescription('');
                        setPin('');
                    } else {
                        const errorMsg = txResult?.error || 'Transaction failed - no response data';
                        console.error('Transaction failed:', { txResult, errorMsg });
                        showError(errorMsg);
                    }
                } catch (error) {
                    console.error('Transaction error details:', { 
                        message: error.message, 
                        status: error.status,
                        data: error.data,
                        fullError: error 
                    });
                    showError(error.message || 'Transaction failed. Please try again.');
                }
            } else {
                setPinError(result?.error || 'Invalid PIN. Please try again.');
                console.error('PIN verification failed:', result?.error);
            }
        } catch (error) {
            setPinError(error.message || 'PIN verification failed. Please try again.');
            console.error('PIN verification error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return formatCurrencyByPreference(amount, user);
    };

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Deposit & Withdraw
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Manage your account balance with deposits and withdrawals
                </p>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{formatCurrency(user.balance)}</div>
                            <div className="stat-label">Current Balance</div>
                        </div>
                        <CreditCard size={32} style={{ color: '#667eea' }} />
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <button
                            onClick={() => setActiveTab('deposit')}
                            style={{
                                padding: '1rem',
                                border: 'none',
                                background: activeTab === 'deposit' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'deposit' ? 'white' : 'var(--text-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <ArrowUpCircle size={18} />
                            Deposit
                        </button>
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            style={{
                                padding: '1rem',
                                border: 'none',
                                background: activeTab === 'withdraw' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'withdraw' ? 'white' : 'var(--text-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <ArrowDownCircle size={18} />
                            Withdraw
                        </button>
                    </div>
                </div>

                <form onSubmit={activeTab === 'deposit' ? handleDeposit : handleWithdraw}>
                    <div className="form-group">
                        <label className="form-label">
                            {activeTab === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'}
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            required
                            placeholder="Enter amount"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description (Optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Purpose of transaction"
                        />
                    </div>

                    {pinError && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            fontSize: '0.9rem'
                        }}>
                            {pinError}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Enter PIN</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            className="form-input"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter 4-6 digit PIN"
                            pattern="[0-9]{4,6}"
                            autoComplete="off"
                            style={{
                                letterSpacing: '0.2em',
                                fontSize: '1.2rem'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Current Balance:</span>
                            <strong>{formatCurrency(user.balance)}</strong>
                        </div>
                        {activeTab === 'deposit' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>After Deposit:</span>
                                <strong style={{ color: '#28a745' }}>
                                    {formatCurrency(user.balance + parseFloat(amount || 0))}
                                </strong>
                            </div>
                        )}
                        {activeTab === 'withdraw' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>After Withdrawal:</span>
                                <strong style={{ color: '#dc3545' }}>
                                    {formatCurrency(user.balance - parseFloat(amount || 0))}
                                </strong>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className={`btn ${activeTab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (
                            activeTab === 'deposit' ? (
                                <>
                                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                                    Confirm Deposit
                                </>
                            ) : (
                                <>
                                    <Minus size={18} style={{ marginRight: '0.5rem' }} />
                                    Confirm Withdrawal
                                </>
                            )
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DepositWithdraw;

