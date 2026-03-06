const emailService = require('./index');

const sendWithGuard = async (name, handler) => {
    if (!emailService.isConfigured()) {
        console.warn(`Email service not configured. Skipping ${name}.`);
        return false;
    }

    try {
        await handler();
        return true;
    } catch (error) {
        console.error(`Error sending ${name}:`, error.message);
        return false;
    }
};

const sendWelcomeEmail = async (email, name) => sendWithGuard('welcome email', () => (
    emailService.sendWelcomeEmail(email, name)
));

const sendAccountCreatedEmail = async (email, name, accountNumber) => sendWithGuard('account created email', () => (
    emailService.sendAccountCreatedEmail(email, name, accountNumber)
));

const sendTransactionNotification = async (email, transactionDetails) => sendWithGuard('transaction notification', () => (
    emailService.sendTransactionNotification(email, transactionDetails)
));

const sendBillPaymentNotification = async (email, billDetails) => sendWithGuard('bill payment notification', () => (
    emailService.sendBillPaymentNotification(email, billDetails)
));

const sendGoalUpdateNotification = async (email, goalDetails) => sendWithGuard('goal update notification', () => (
    emailService.sendGoalUpdateNotification(email, goalDetails)
));

const sendInvestmentNotification = async (email, investmentDetails) => sendWithGuard('investment notification', () => (
    emailService.sendInvestmentNotification(email, investmentDetails)
));

const sendSecurityAlert = async (email, alertDetails) => sendWithGuard('security alert', () => (
    emailService.sendSecurityAlert(email, alertDetails)
));

const sendLoginOtpEmail = async (email, name, otpCode) => sendWithGuard('login OTP email', () => (
    emailService.sendLoginOtpEmail(email, name, otpCode)
));

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
