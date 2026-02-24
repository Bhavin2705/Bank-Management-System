import { ArrowDownCircle, ArrowUpCircle, CreditCard, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { api } from '../utils/api';

const DepositWithdraw = ({ user, onUserUpdate }) => {
    const { showError, showSuccess } = useNotification();
    const [activeTab, setActiveTab] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null);
    const [pin, setPin] = useState('');
    const [pinVerifying, setPinVerifying] = useState(false);
    const [pinError, setPinError] = useState('');
    const [cards, setCards] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState('');

    useEffect(() => {
        // Load user's cards
        loadCards();
    }, [user]);

    const loadCards = async () => {
        try {
            const res = await api.cards.getAll();
            if (res && res.success) {
                setCards(res.data || []);
                // Auto-select first card if available
                if (res.data && res.data.length > 0) {
                    setSelectedCardId(res.data[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading cards:', error);
        }
    };

    const verifyPin = async () => {
        if (!pin.trim()) {
            setPinError('Please enter your PIN');
            return;
        }

        try {
            setPinVerifying(true);
            setPinError('');
            console.log('Starting PIN verification...', { pin: '****', pendingTransaction });
            const result = await api.users.verifyPin(pin);
            console.log('PIN verification response:', result);

            if (result && result.success) {
                console.log('PIN verified successfully, processing transaction...');
                // PIN is correct, proceed with the transaction
                const transactionSuccess = await processPendingTransaction();
                
                if (transactionSuccess) {
                    console.log('Transaction processed successfully, closing modal...');
                    setShowPinModal(false);
                    setPin('');
                    setPendingTransaction(null);
                }
                // If transaction failed, don't close modal - user can retry or cancel
            } else {
                setPinError(result?.error || 'Invalid PIN. Please try again.');
                console.error('PIN verification failed:', result?.error);
            }
        } catch (error) {
            setPinError(error.message || 'PIN verification failed. Please try again.');
            console.error('PIN verification error:', error);
        } finally {
            setPinVerifying(false);
        }
    };

    const processPendingTransaction = async () => {
        if (!pendingTransaction) {
            showError('No pending transaction found');
            return false;
        }

        const { type, amount: transAmount, description: desc, cardId } = pendingTransaction;
        const transactionData = {
            type,
            amount: transAmount,
            description: desc || (type === 'credit' ? 'Cash Deposit' : 'Cash Withdrawal'),
            category: type === 'credit' ? 'deposit' : 'withdrawal',
            cardId: cardId || null
        };

        try {
            console.log('Creating transaction with data:', transactionData);
            const result = await api.transactions.create(transactionData);
            
            console.log('Transaction API response:', result);

            if (result && result.success && result.data) {
                const isDeposit = type === 'credit';
                const successMsg = isDeposit 
                    ? `Successfully deposited Rs${transAmount.toFixed(2)}` 
                    : `Successfully withdrew Rs${transAmount.toFixed(2)}`;
                
                console.log('Transaction successful:', successMsg);
                showSuccess(successMsg);

                // Update user balance in parent component
                const newBalance = isDeposit 
                    ? user.balance + transAmount 
                    : user.balance - transAmount;
                    
                onUserUpdate({ ...user, balance: newBalance });

                // Store PIN requirement preference in localStorage
                localStorage.setItem('pinRequiredForTransactions', 'true');

                // Reset form fields
                setAmount('');
                setDescription('');
                
                return true;
            } else {
                const errorMsg = result?.error || 'Transaction failed - no response data';
                console.error('Transaction failed:', { result, errorMsg });
                showError(errorMsg);
                return false;
            }
        } catch (error) {
            console.error('Transaction error details:', { 
                message: error.message, 
                status: error.status,
                data: error.data,
                fullError: error 
            });
            showError(error.message || 'Transaction failed. Please try again.');
            return false;
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();

        const depositAmount = parseFloat(amount);
        if (depositAmount <= 0) {
            showError('Deposit amount must be greater than 0');
            return;
        }

        if (!selectedCardId && cards.length > 0) {
            showError('Please select a card');
            return;
        }

        // Set pending transaction and show PIN modal
        setPendingTransaction({
            type: 'credit',
            amount: depositAmount,
            description: description || 'Cash Deposit',
            cardId: selectedCardId
        });
        setShowPinModal(true);
        setPinError('');
        setPin('');
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

        if (!selectedCardId && cards.length > 0) {
            showError('Please select a card');
            return;
        }

        // Set pending transaction and show PIN modal
        setPendingTransaction({
            type: 'debit',
            amount: withdrawAmount,
            description: description || 'Cash Withdrawal',
            cardId: selectedCardId
        });
        setShowPinModal(true);
        setPinError('');
        setPin('');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
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

            {/* Summary Cards */}
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
                            placeholder="Enter transaction description"
                        />
                    </div>

                    {cards.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Select Card</label>
                            <select
                                className="form-input"
                                value={selectedCardId}
                                onChange={(e) => setSelectedCardId(e.target.value)}
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">-- Choose a card --</option>
                                {cards.map((card) => (
                                    <option key={card.id} value={card.id}>
                                        {card.cardName} (****{String(card.cardNumber).slice(-4)}) - {card.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {cards.length === 0 && (
                        <div style={{
                            padding: '1rem',
                            background: '#fff3cd',
                            borderLeft: '4px solid #ffc107',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            color: '#856404'
                        }}>
                            <strong>No cards found.</strong> Go to <a href="/cards" style={{ color: '#667eea', textDecoration: 'underline' }}>My Cards</a> to create one.
                        </div>
                    )}

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
                                    Deposit Funds
                                </>
                            ) : (
                                <>
                                    <Minus size={18} style={{ marginRight: '0.5rem' }} />
                                    Withdraw Funds
                                </>
                            )
                        )}
                    </button>
                </form>
            </div>

            {/* PIN Verification Modal */}
            {showPinModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                            Verify PIN
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Enter your PIN to confirm {pendingTransaction?.type === 'credit' ? 'deposit' : 'withdrawal'}
                        </p>

                        {pinError && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                marginBottom: '1rem'
                            }}>
                                {pinError}
                            </div>
                        )}

                        <input
                            type="password"
                            inputMode="numeric"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter 4-6 digit PIN"
                            pattern="[0-9]{4,6}"
                            autoComplete="off"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                marginBottom: '1.5rem',
                                fontSize: '1rem',
                                letterSpacing: '0.2em'
                            }}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    setShowPinModal(false);
                                    setPendingTransaction(null);
                                    setPin('');
                                    setPinError('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'transparent',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem'
                                }}
                                disabled={pinVerifying}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={verifyPin}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#667eea',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: pinVerifying || !pin.trim() ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    opacity: pinVerifying || !pin.trim() ? 0.6 : 1
                                }}
                                disabled={!pin.trim() || pinVerifying}
                            >
                                {pinVerifying ? 'Verifying...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepositWithdraw;
