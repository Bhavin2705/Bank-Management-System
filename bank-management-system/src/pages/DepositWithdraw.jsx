import { ArrowDownCircle, ArrowUpCircle, Building, CreditCard, Minus, PiggyBank, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { api } from '../utils/api';

const DepositWithdraw = ({ user, onUserUpdate }) => {
    const { showError, showSuccess } = useNotification();
    const [activeTab, setActiveTab] = useState('deposit');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Component is now simplified to use main account only
    }, [user]);

    const accountTypes = [
        {
            id: 'savings',
            name: 'Savings Account',
            icon: PiggyBank
        },
        {
            id: 'checking',
            name: 'Checking Account',
            icon: CreditCard
        },
        {
            id: 'business',
            name: 'Business Account',
            icon: Building
        }
    ];

    const handleDeposit = async (e) => {
        e.preventDefault();

        const depositAmount = parseFloat(amount);
        if (depositAmount <= 0) {
            showError('Deposit amount must be greater than 0');
            return;
        }

        try {
            setLoading(true);
            const transactionData = {
                type: 'credit',
                amount: depositAmount,
                description: description || 'Cash Deposit',
                category: 'deposit'
            };

            const result = await api.transactions.create(transactionData);

            if (result.success) {
                showSuccess(`Successfully deposited ₹${depositAmount.toFixed(2)}`);

                // Update user balance in parent component
                const newBalance = user.balance + depositAmount;
                onUserUpdate({ ...user, balance: newBalance });

                setAmount('');
                setDescription('');
            } else {
                showError(result.error || 'Deposit failed');
            }
        } catch (error) {
            showError('Deposit failed. Please try again.');
            console.error('Deposit error:', error);
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

        try {
            setLoading(true);
            const transactionData = {
                type: 'debit',
                amount: withdrawAmount,
                description: description || 'Cash Withdrawal',
                category: 'withdrawal'
            };

            const result = await api.transactions.create(transactionData);

            if (result.success) {
                showSuccess(`Successfully withdrew ₹${withdrawAmount.toFixed(2)}`);

                // Update user balance in parent component
                const newBalance = user.balance - withdrawAmount;
                onUserUpdate({ ...user, balance: newBalance });

                setAmount('');
                setDescription('');
            } else {
                showError(result.error || 'Withdrawal failed');
            }
        } catch (error) {
            showError('Withdrawal failed. Please try again.');
            console.error('Withdrawal error:', error);
        } finally {
            setLoading(false);
        }
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
        </div>
    );
};

export default DepositWithdraw;
