const authRoutes = require('./auth');
const userRoutes = require('./users');
const transactionRoutes = require('./transactions');
const recurringRoutes = require('./recurring');
const billsRoutes = require('./bills');
const banksRoutes = require('./banks');
const cardRoutes = require('./cards');
const exchangeRoutes = require('./exchange');
const notificationRoutes = require('./notifications');
const budgetsRoutes = require('./budgets');
const settingsRoutes = require('./settings');
const kycRoutes = require('./kyc');
const adminKycRoutes = require('./adminKyc');

const registerApiRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/recurring', recurringRoutes);
    app.use('/api/bills', billsRoutes);
    app.use('/api/banks', banksRoutes);
    app.use('/api/cards', cardRoutes);
    app.use('/api/exchange', exchangeRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/budgets', budgetsRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/kyc', kycRoutes);
    app.use('/api/admin/kyc', adminKycRoutes);
};

module.exports = registerApiRoutes;
