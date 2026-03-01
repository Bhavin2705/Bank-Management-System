import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyByPreference } from '../../utils/currency';
import { addTransaction } from '../../utils/transactions';
import api from '../../utils/api';
import BillsTab from './components/BillsTab';
import RecurringTab from './components/RecurringTab';
import {
  billCategories,
  frequencyMap,
  getFrequencyLabel,
  getMonthlyRecurringTotal,
  initialBillFormData,
  initialRecurringFormData,
} from './constants';
import { formatDate, getNextDueDate } from './utils';
import { useNotification } from '../../components/providers/NotificationProvider';

const Payments = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('bills');

  const { showError: showBillError } = useNotification();
  const { showError: showRecurringError, showSuccess: showRecurringSuccess } = useNotification();

  const [bills, setBills] = useState([]);
  const [showBillForm, setShowBillForm] = useState(false);
  const [billFormData, setBillFormData] = useState(initialBillFormData);
  const [submittingBill, setSubmittingBill] = useState(false);

  const [recurringPayments, setRecurringPayments] = useState([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringFormData, setRecurringFormData] = useState(initialRecurringFormData);
  const [balanceWarning, setBalanceWarning] = useState('');
  const [submittingRecurring, setSubmittingRecurring] = useState(false);
  const [updatingRecurringId, setUpdatingRecurringId] = useState(null);
  const [deletingRecurringId, setDeletingRecurringId] = useState(null);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const loadBills = useCallback(async () => {
    try {
      const res = await api.bills.getAll();
      setBills(res.success ? res.data : []);
    } catch {
      setBills([]);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [user?._id, user?.id, loadBills]);

  const handleBillChange = (e) => {
    setBillFormData({ ...billFormData, [e.target.name]: e.target.value });
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    if (submittingBill) return;

    const amount = parseFloat(billFormData.amount);
    if (amount <= 0) return;

    if (amount > user.balance) {
      showBillError('Insufficient balance for bill payment');
      return;
    }

    const billPayload = {
      name: billFormData.name,
      type: billFormData.category,
      amount,
      dueDate: billFormData.dueDate,
      billNumber: `BILL-${Date.now()}`,
      accountNumber: user.accountNumber || 'N/A',
      status: 'paid',
      paidAmount: amount,
      paidDate: new Date(),
      paymentMethod: 'online',
      description: `Bill Payment: ${billFormData.name} (${billFormData.category})`,
    };

    let billRes;
    try {
      setSubmittingBill(true);
      billRes = await api.bills.create(billPayload);
    } catch {
      showBillError('Failed to create bill');
      setSubmittingBill(false);
      return;
    }

    const transaction = {
      userId: user._id || user.id,
      type: 'debit',
      amount,
      description: `Bill Payment: ${billFormData.name} (${billFormData.category})`,
      billId: billRes?.data?._id,
    };

    try {
      const createdTransaction = await addTransaction(transaction);
      if (!createdTransaction) {
        throw new Error('Transaction was not created');
      }
      const nextBalance = typeof createdTransaction?.balance === 'number'
        ? createdTransaction.balance
        : user.balance - amount;
      onUserUpdate({ ...user, balance: nextBalance });
      await loadBills();
      setShowBillForm(false);
      setBillFormData(initialBillFormData);
    } catch (err) {
      console.error('Error processing bill payment:', err);
      showBillError('Error processing bill payment');
      if (billRes?.data?._id) {
        try {
          await api.bills.delete(billRes.data._id);
        } catch (rollbackError) {
          console.error('Error rolling back bill creation:', rollbackError);
        }
      }
    } finally {
      setSubmittingBill(false);
    }
  };

  const getUserBalance = useCallback(() => user?.balance || 0, [user]);

  const loadRecurringPayments = useCallback(async () => {
    try {
      const res = await api.recurring.getAll();
      setRecurringPayments(res.success ? res.data : []);
    } catch {
      setRecurringPayments([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRecurringPayments();
    }
  }, [user, loadRecurringPayments]);

  const handleRecurringAmountChange = (e) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setRecurringFormData({ ...recurringFormData, amount: e.target.value });

    if (newAmount > 0 && newAmount > user.balance) {
      setBalanceWarning(`INSUFFICIENT BALANCE: Amount (${formatCurrency(newAmount)}) exceeds your balance (${formatCurrency(user.balance)})`);
      return;
    }

    if (newAmount > 0 && newAmount > user.balance * 0.8) {
      setBalanceWarning(`HIGH AMOUNT: This is ${Math.round((newAmount / user.balance) * 100)}% of your current balance`);
      return;
    }

    setBalanceWarning('');
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    if (submittingRecurring) return;

    const amount = parseFloat(recurringFormData.amount);
    if (amount <= 0) {
      showRecurringError('Amount must be greater than 0');
      return;
    }

    if (!recurringFormData.startDate) {
      showRecurringError('Start date is required');
      return;
    }

    if (amount > getUserBalance()) {
      showRecurringError('Insufficient balance for recurring payment');
      return;
    }

    if (!recurringFormData.recipientName.trim()) {
      showRecurringError('Recipient name is required');
      return;
    }

    if (!recurringFormData.recipientAccount.trim() && !recurringFormData.recipientPhone.trim()) {
      showRecurringError('Enter recipient account number or phone number');
      return;
    }

    const { startDate, nextDueDate } = getNextDueDate(
      recurringFormData.startDate,
      recurringFormData.frequency,
      frequencyMap,
    );

    const recurringPayload = {
      name: recurringFormData.recipientName,
      beneficiaryName: recurringFormData.recipientName,
      toAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone,
      fromAccount: user._id,
      amount,
      frequency: recurringFormData.frequency,
      description: recurringFormData.description || 'Recurring payment',
      type: 'other',
      startDate,
      nextDueDate,
      status: 'active',
    };

    let createdRecurringId = null;
    try {
      setSubmittingRecurring(true);
      const recurringRes = await api.recurring.create(recurringPayload);
      if (!recurringRes?.success || !recurringRes?.data?._id) {
        showRecurringError('Failed to create recurring payment');
        setSubmittingRecurring(false);
        return;
      }
      createdRecurringId = recurringRes.data._id;
    } catch {
      showRecurringError('Failed to create recurring payment');
      setSubmittingRecurring(false);
      return;
    }

    try {
      const transactionResult = await addTransaction({
        type: 'debit',
        amount,
        description: `Recurring Payment: ${recurringFormData.recipientName}`,
        category: 'bill_payment',
        transferType: 'external',
        recipientName: recurringFormData.recipientName,
        recipientAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone,
      });
      if (!transactionResult) {
        throw new Error('Transaction was not created');
      }
      const nextBalance = typeof transactionResult?.balance === 'number'
        ? transactionResult.balance
        : user.balance - amount;
      onUserUpdate({ ...user, balance: nextBalance });
      showRecurringSuccess('Recurring payment created successfully! First payment deducted from your account.');
    } catch (err) {
      console.error('Error creating transaction:', err);
      if (createdRecurringId) {
        try {
          await api.recurring.delete(createdRecurringId);
        } catch (rollbackError) {
          console.error('Error rolling back recurring payment after transaction failure:', rollbackError);
        }
      }
      showRecurringError('Recurring payment was not saved because first payment failed.');
      setSubmittingRecurring(false);
      return;
    }

    setRecurringFormData(initialRecurringFormData);
    setBalanceWarning('');
    setShowRecurringForm(false);
    await loadRecurringPayments();
    setSubmittingRecurring(false);
  };

  const deleteRecurringPayment = async (paymentId) => {
    if (deletingRecurringId) return;
    try {
      setDeletingRecurringId(paymentId);
      await api.recurring.delete(paymentId);
      showRecurringSuccess('Recurring payment deleted successfully!');
      await loadRecurringPayments();
    } catch {
      showRecurringError('Failed to delete recurring payment');
    } finally {
      setDeletingRecurringId(null);
    }
  };

  const toggleRecurringStatus = async (paymentId) => {
    if (updatingRecurringId) return;
    const payment = recurringPayments.find((p) => p._id === paymentId);
    if (!payment) return;

    const newStatus = payment.status === 'active' ? 'paused' : 'active';

    try {
      setUpdatingRecurringId(paymentId);
      await api.recurring.update(paymentId, { status: newStatus });
      showRecurringSuccess(`Recurring payment ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`);
      await loadRecurringPayments();
    } catch {
      showRecurringError('Failed to update recurring payment');
    } finally {
      setUpdatingRecurringId(null);
    }
  };

  const monthlyTotal = getMonthlyRecurringTotal(recurringPayments);

  return (
    <div className="container">
      <div className="payments-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className={activeTab === 'bills' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('bills')}>One-time Bills</button>
        <button className={activeTab === 'recurring' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('recurring')}>Recurring Payments</button>
      </div>

      {activeTab === 'bills' && (
        <BillsTab
          bills={bills}
          showBillForm={showBillForm}
          setShowBillForm={setShowBillForm}
          billFormData={billFormData}
          setBillFormData={setBillFormData}
          handleBillSubmit={handleBillSubmit}
          handleBillChange={handleBillChange}
          billCategories={billCategories}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          submittingBill={submittingBill}
        />
      )}

      {activeTab === 'recurring' && (
        <RecurringTab
          recurringPayments={recurringPayments}
          showRecurringForm={showRecurringForm}
          setShowRecurringForm={setShowRecurringForm}
          recurringFormData={recurringFormData}
          setRecurringFormData={setRecurringFormData}
          handleRecurringAmountChange={handleRecurringAmountChange}
          handleRecurringSubmit={handleRecurringSubmit}
          toggleRecurringStatus={toggleRecurringStatus}
          deleteRecurringPayment={deleteRecurringPayment}
          balanceWarning={balanceWarning}
          formatCurrency={formatCurrency}
          getFrequencyLabel={getFrequencyLabel}
          monthlyTotal={monthlyTotal}
          submittingRecurring={submittingRecurring}
          updatingRecurringId={updatingRecurringId}
          deletingRecurringId={deletingRecurringId}
        />
      )}
    </div>
  );
};

export default Payments;

