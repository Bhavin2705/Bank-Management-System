const sender = require('./sender');
const templates = require('./templates');
const { getEmailConfig } = require('./config');

class EmailService {
    isConfigured() {
        return sender.isConfigured();
    }

    verifyConnection() {
        return sender.verifyConnection();
    }

    getStatus() {
        return sender.getStatus();
    }

    async sendMail(mailOptions) {
        return sender.send(mailOptions);
    }

    async sendPasswordResetEmail(email, resetUrl) {
        return this.sendTemplateEmail({
            to: email,
            subject: 'Password Reset Request - BankPro',
            html: templates.getPasswordResetTemplate(resetUrl)
        });
    }

    async sendWelcomeEmail(email, name) {
        return this.sendTemplateEmail({
            to: email,
            subject: 'Welcome to BankPro - Your Account is Ready',
            html: templates.getWelcomeTemplate(name)
        });
    }

    async sendAccountCreatedEmail(email, name, accountNumber) {
        return this.sendTemplateEmail({
            to: email,
            subject: 'Account Successfully Created - BankPro',
            html: templates.getAccountCreatedTemplate(name, accountNumber)
        });
    }

    async sendTransactionNotification(email, transactionDetails) {
        return this.sendTemplateEmail({
            to: email,
            subject: `Transaction Notification - ${transactionDetails.type} of ${transactionDetails.currency} ${transactionDetails.amount}`,
            html: templates.getTransactionTemplate(transactionDetails)
        });
    }

    async sendBillPaymentNotification(email, billDetails) {
        return this.sendTemplateEmail({
            to: email,
            subject: `Bill Payment Confirmation - ${billDetails.billName}`,
            html: templates.getBillPaymentTemplate(billDetails)
        });
    }

    async sendGoalUpdateNotification(email, goalDetails) {
        return this.sendTemplateEmail({
            to: email,
            subject: `Goal Progress Update - ${goalDetails.goalName}`,
            html: templates.getGoalUpdateTemplate(goalDetails)
        });
    }

    async sendInvestmentNotification(email, investmentDetails) {
        return this.sendTemplateEmail({
            to: email,
            subject: `Investment Notification - ${investmentDetails.instrumentName}`,
            html: templates.getInvestmentTemplate(investmentDetails)
        });
    }

    async sendSecurityAlert(email, alertDetails) {
        return this.sendTemplateEmail({
            to: email,
            subject: 'Security Alert - BankPro Account',
            html: templates.getSecurityAlertTemplate(alertDetails)
        });
    }

    async sendLoginOtpEmail(email, name, otpCode) {
        return this.sendTemplateEmail({
            to: email,
            subject: 'Your BankPro Login OTP Code',
            html: templates.getLoginOtpTemplate(name, otpCode)
        });
    }

    async sendTemplateEmail({ to, subject, html }) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const { smtpFrom } = getEmailConfig();
        return this.sendMail({
            from: smtpFrom,
            to,
            subject,
            html
        });
    }
}

module.exports = new EmailService();
