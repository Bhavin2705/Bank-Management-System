import { Building, CheckCircle, CreditCard, PiggyBank, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';

const AccountManagement = ({ user, onUserUpdate }) => {
    const { showSuccess, showError } = useNotification();
    const [accounts, setAccounts] = useState([]);
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [newAccountData, setNewAccountData] = useState({
        type: 'savings',
        name: '',
        initialDeposit: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadAccounts();
    }, [user]);

    const loadAccounts = () => {
        const userAccounts = JSON.parse(localStorage.getItem(`user_accounts_${user.id}`) || '[]');
        setAccounts(userAccounts);
    };

    const accountTypes = [
        {
            id: 'savings',
            name: 'Savings Account',
            icon: PiggyBank,
            description: 'High interest savings with limited withdrawals',
            minDeposit: 100,
            interestRate: '3.5%'
        },
        {
            id: 'checking',
            name: 'Checking Account',
            icon: CreditCard,
            description: 'Daily transaction account with debit card',
            minDeposit: 50,
            interestRate: '0.1%'
        },
        {
            id: 'business',
            name: 'Business Account',
            icon: Building,
            description: 'Business banking with advanced features',
            minDeposit: 500,
            interestRate: '1.2%'
        }
    ];

    const handleNewAccountSubmit = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const selectedType = accountTypes.find(type => type.id === newAccountData.type);
        const depositAmount = parseFloat(newAccountData.initialDeposit);

        if (!selectedType) {
            showError('Please select a valid account type');
            return;
        }

        if (depositAmount < selectedType.minDeposit) {
            showError(`Minimum deposit for ${selectedType.name} is ₹${selectedType.minDeposit}`);
            return;
        }

        if (depositAmount > user.balance) {
            showError('Insufficient funds for initial deposit');
            return;
        }

        // Create new account
        const newAccount = {
            id: Date.now().toString(),
            type: newAccountData.type,
            name: newAccountData.name || `${selectedType.name} - ${accounts.length + 1}`,
            balance: depositAmount,
            accountNumber: generateAccountNumber(),
            createdAt: new Date().toISOString(),
            status: 'active',
            interestRate: selectedType.interestRate
        };

        // Update user's accounts
        const updatedAccounts = [...accounts, newAccount];
        localStorage.setItem(`user_accounts_${user.id}`, JSON.stringify(updatedAccounts));

        // Deduct from main balance and record transaction
        const updatedUser = { ...user, balance: user.balance - depositAmount };
        localStorage.setItem('bank_current_user', JSON.stringify(updatedUser));

        // Record transaction
        const transactions = JSON.parse(localStorage.getItem(`transactions_${user.id}`) || '[]');
        const transaction = {
            id: Date.now().toString(),
            type: 'debit',
            amount: depositAmount,
            description: `Initial deposit for ${newAccount.name}`,
            timestamp: new Date().toISOString(),
            balance: updatedUser.balance,
            accountId: newAccount.id
        };
        transactions.push(transaction);
        localStorage.setItem(`transactions_${user.id}`, JSON.stringify(transactions));

        setAccounts(updatedAccounts);
        onUserUpdate(updatedUser);
        showSuccess(`Successfully opened ${newAccount.name}! 🎉`);
        setShowNewAccountForm(false);
        setNewAccountData({
            type: 'savings',
            name: '',
            initialDeposit: ''
        });
    };

    const generateAccountNumber = () => {
        return '****' + Math.random().toString().slice(-4) + Math.random().toString().slice(-4);
    };

    const closeAccount = (accountId) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (!account) return;

        if (account.balance > 0) {
            showError('Cannot close account with remaining balance. Please withdraw all funds first.');
            return;
        }

        const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
        localStorage.setItem(`user_accounts_${user.id}`, JSON.stringify(updatedAccounts));
        setAccounts(updatedAccounts);
        showSuccess('Account closed successfully 🏦');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getAccountIcon = (type) => {
        const accountType = accountTypes.find(t => t.id === type);
        return accountType ? accountType.icon : CreditCard;
    };

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Account Management
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Manage your accounts - open new accounts, view balances, and close accounts
                </p>
            </div>

            {/* Summary Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{accounts.length}</div>
                            <div className="stat-label">Total Accounts</div>
                        </div>
                        <CreditCard size={32} style={{ color: '#667eea' }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}</div>
                            <div className="stat-label">Total Balance</div>
                        </div>
                        <PiggyBank size={32} style={{ color: '#28a745' }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{accounts.filter(acc => acc.status === 'active').length}</div>
                            <div className="stat-label">Active Accounts</div>
                        </div>
                        <CheckCircle size={32} style={{ color: '#28a745' }} />
                    </div>
                </div>
            </div>

            {/* New Account Button */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => setShowNewAccountForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} />
                    Open New Account
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            {/* New Account Form */}
            {showNewAccountForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Open New Account</h3>
                        <button
                            onClick={() => setShowNewAccountForm(false)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleNewAccountSubmit}>
                        <div className="form-group">
                            <label className="form-label">Account Type</label>
                            <select
                                className="form-input"
                                value={newAccountData.type}
                                onChange={(e) => setNewAccountData({ ...newAccountData, type: e.target.value })}
                                required
                            >
                                {accountTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} - Min: ₹{type.minDeposit}, Interest: {type.interestRate}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Account Name (Optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newAccountData.name}
                                onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                                placeholder="Custom name for your account"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Initial Deposit</label>
                            <input
                                type="number"
                                className="form-input"
                                value={newAccountData.initialDeposit}
                                onChange={(e) => setNewAccountData({ ...newAccountData, initialDeposit: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                                placeholder="Enter initial deposit amount"
                            />
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                            <strong>Available Balance: {formatCurrency(user.balance)}</strong>
                        </div>

                        <button type="submit" className="btn btn-primary">
                            Open Account
                        </button>
                    </form>
                </div>
            )}

            {/* Accounts List */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Your Accounts</h3>

                {accounts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                    }}>
                        No accounts found. Open your first account to get started!
                    </div>
                ) : (
                    <div className="transaction-list">
                        {accounts.map((account) => {
                            const Icon = getAccountIcon(account.type);
                            return (
                                <div key={account.id} className="transaction-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            padding: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-tertiary)'
                                        }}>
                                            <Icon size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                                {account.name}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Account: {account.accountNumber} • Created: {new Date(account.createdAt).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Type: {accountTypes.find(t => t.id === account.type)?.name} • Interest: {account.interestRate}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '1.1rem',
                                            color: '#28a745'
                                        }}>
                                            {formatCurrency(account.balance)}
                                        </div>
                                        <div style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: account.status === 'active' ? '#28a745' : '#dc3545',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            display: 'inline-block',
                                            marginTop: '0.5rem'
                                        }}>
                                            {account.status.toUpperCase()}
                                        </div>
                                        {account.balance === 0 && account.status === 'active' && (
                                            <button
                                                onClick={() => closeAccount(account.id)}
                                                style={{
                                                    marginTop: '0.5rem',
                                                    padding: '0.25rem 0.5rem',
                                                    border: '1px solid #dc3545',
                                                    background: 'none',
                                                    color: '#dc3545',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                Close Account
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountManagement;
