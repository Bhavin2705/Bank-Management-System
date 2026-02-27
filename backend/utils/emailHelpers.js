const emailService = require('./emailService');

const sendWelcomeEmail = async (email, name) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping welcome email.');
        return false;
    }

    try {
        await emailService.sendWelcomeEmail(email, name);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
        return false;
    }
};

const sendAccountCreatedEmail = async (email, name, accountNumber) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping account created email.');
        return false;
    }

    try {
        await emailService.sendAccountCreatedEmail(email, name, accountNumber);
        return true;
    } catch (error) {
        console.error('Error sending account created email:', error.message);
        return false;
    }
};

const sendTransactionNotification = async (email, transactionDetails) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping transaction notification.');
        return false;
    }

    try {
        await emailService.sendTransactionNotification(email, transactionDetails);
        return true;
    } catch (error) {
        console.error('Error sending transaction notification:', error.message);
        return false;
    }
};

const sendBillPaymentNotification = async (email, billDetails) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping bill payment notification.');
        return false;
    }

    try {
        await emailService.sendBillPaymentNotification(email, billDetails);
        return true;
    } catch (error) {
        console.error('Error sending bill payment notification:', error.message);
        return false;
    }
};

const sendGoalUpdateNotification = async (email, goalDetails) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping goal update notification.');
        return false;
    }

    try {
        await emailService.sendGoalUpdateNotification(email, goalDetails);
        return true;
    } catch (error) {
        console.error('Error sending goal update notification:', error.message);
        return false;
    }
};

const sendInvestmentNotification = async (email, investmentDetails) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping investment notification.');
        return false;
    }

    try {
        await emailService.sendInvestmentNotification(email, investmentDetails);
        return true;
    } catch (error) {
        console.error('Error sending investment notification:', error.message);
        return false;
    }
};

const sendSecurityAlert = async (email, alertDetails) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping security alert.');
        return false;
    }

    try {
        await emailService.sendSecurityAlert(email, alertDetails);
        return true;
    } catch (error) {
        console.error('Error sending security alert:', error.message);
        return false;
    }
};

const sendLoginOtpEmail = async (email, name, otpCode) => {
    if (!emailService.isConfigured()) {
        console.warn('Email service not configured. Skipping login OTP email.');
        return false;
    }

    try {
        await emailService.sendLoginOtpEmail(email, name, otpCode);
        return true;
    } catch (error) {
        console.error('Error sending login OTP email:', error.message);
        return false;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendAccountCreatedEmail,
    sendTransactionNotification,
    sendBillPaymentNotification,
    sendGoalUpdateNotification,
    sendInvestmentNotification,
    sendSecurityAlert,
    sendLoginOtpEmail
};
