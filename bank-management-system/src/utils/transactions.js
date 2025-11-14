import api from './api.js';

export const getTransactions = async (params = {}) => {
  try {
    const response = await api.transactions.getAll(params);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

export const addTransaction = async (transactionData) => {
  try {
    const response = await api.transactions.create(transactionData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const getTransactionById = async (id) => {
  try {
    const response = await api.transactions.getById(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
};

export const updateTransaction = async (id, transactionData) => {
  try {
    const response = await api.transactions.update(id, transactionData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const response = await api.transactions.delete(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const getTransactionStats = async () => {
  try {
    const [statsResponse, transactionsResponse] = await Promise.all([
      api.transactions.getStats(),
      api.transactions.getAll({ limit: 5 })
    ]);

    const backendStats = statsResponse.success ? statsResponse.data : {
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0,
      categories: []
    };

    const recentTransactions = transactionsResponse.success ? transactionsResponse.data : [];

    // Transform backend data to match Dashboard expectations
    return {
      totalTransactions: backendStats.transactionCount || 0,
      monthlyIncome: backendStats.totalCredits || 0,
      monthlyExpenses: backendStats.totalDebits || 0,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type, // 'credit' or 'debit'
        date: tx.createdAt
      }))
    };
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return {
      totalTransactions: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      recentTransactions: []
    };
  }
};

export const getTransactionCategories = async () => {
  try {
    const response = await api.transactions.getCategories();
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const transferMoney = async (transferData) => {
  try {
    const response = await api.transactions.transfer(transferData);
    return response;
  } catch (error) {
    console.error('Error processing transfer:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const getTransactionsSync = () => {
  // This function is deprecated, use getTransactions() instead
  console.warn('getTransactionsSync is deprecated, use getTransactions() instead');
  return [];
};
