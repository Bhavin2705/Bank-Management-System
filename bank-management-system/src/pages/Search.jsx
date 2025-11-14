import { Filter, Search as SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTransactions } from '../utils/transactions';

const Search = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [results, setResults] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, [user.id]);

  const loadTransactions = async () => {
    try {
      const transactions = await getTransactions();
      setAllTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setAllTransactions([]);
    }
  };

  const handleSearch = () => {
    let filtered = allTransactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setResults(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Search Transactions
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Find specific transactions in your history
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group">
            <label className="form-label">Search Description</label>
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter keywords..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <select
              className="form-input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="credit">Deposits</option>
              <option value="debit">Withdrawals</option>
            </select>
          </div>

          <button onClick={handleSearch} className="btn btn-primary">
            <SearchIcon size={16} />
            Search
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={20} />
            Search Results ({results.length})
          </h3>

          <div className="transaction-list">
            {results.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {transaction.description}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatDate(transaction.date)}
                  </div>
                </div>
                <div style={{
                  fontWeight: '600',
                  color: transaction.type === 'credit' ? 'var(--success)' : 'var(--error)'
                }}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && searchTerm && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <SearchIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
          <h3>No results found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try different search terms or filters</p>
        </div>
      )}
    </div>
  );
};

export default Search;
