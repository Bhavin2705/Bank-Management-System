const nodemailer = require('nodemailer');
const {
    getPasswordResetTemplate,
    getWelcomeTemplate,
    getAccountCreatedTemplate,
    getTransactionTemplate,
    getLoginOtpTemplate,
    getBillPaymentTemplate,
    getGoalUpdateTemplate,
    getInvestmentTemplate,
    getSecurityAlertTemplate
} = require('./emailTemplates');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.lastVerification = {
            ok: false,
            message: 'Not verified',
            checkedAt: null
        };
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
            const smtpPort = process.env.SMTP_PORT || process.env.EMAIL_PORT;
            const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
            const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
            const configuredPort = smtpPort ? parseInt(smtpPort, 10) : 587;
            const smtpSecure = process.env.SMTP_SECURE !== undefined
                ? process.env.SMTP_SECURE === 'true'
                : configuredPort === 465;

            if (smtpHost && smtpUser && smtpPass) {
                this.transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: configuredPort,
                    secure: smtpSecure,
                    family: 4,
                    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
                    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
                    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });
                this.initialized = true;
                this.verifyConnection().catch((err) => {
                    this.lastVerification = {
                        ok: false,
                        message: err.message || 'SMTP verification failed',
                        checkedAt: new Date().toISOString()
                    };
                });
            } else {
                this.lastVerification = {
                    ok: false,
                    message: 'Missing SMTP/EMAIL environment variables',
                    checkedAt: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Email service initialization error:', error.message);
            this.initialized = false;
            this.lastVerification = {
                ok: false,
                message: error.message || 'Initialization failed',
                checkedAt: new Date().toISOString()
            };
        }
    }

    isConfigured() {
        return !!(this.initialized && this.transporter);
    }

    async verifyConnection() {
        if (!this.isConfigured()) {
            this.lastVerification = {
                ok: false,
                message: 'Email service not configured',
                checkedAt: new Date().toISOString()
            };
            return false;
        }

        try {
            await this.transporter.verify();
            this.lastVerification = {
                ok: true,
                message: 'SMTP connection verified',
                checkedAt: new Date().toISOString()
            };
            return true;
        } catch (error) {
            this.lastVerification = {
                ok: false,
                message: error.message || 'SMTP verification failed',
                checkedAt: new Date().toISOString()
            };
            return false;
        }
    }

    getStatus() {
        return {
            configured: this.isConfigured(),
            provider: this.isConfigured() ? 'smtp' : 'none',
            verified: !!this.lastVerification.ok,
            message: this.lastVerification.message,
            checkedAt: this.lastVerification.checkedAt
        };
    }

    async sendMail(mailOptions) {
        return this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetEmail(email, resetUrl) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Password Reset Request - BankPro',
            html: getPasswordResetTemplate(resetUrl)
        };

        return this.sendMail(mailOptions);
    }

    async sendWelcomeEmail(email, name) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Welcome to BankPro - Your Account is Ready',
            html: getWelcomeTemplate(name)
        };

        return this.sendMail(mailOptions);
    }

    async sendAccountCreatedEmail(email, name, accountNumber) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Account Successfully Created - BankPro',
            html: getAccountCreatedTemplate(name, accountNumber)
        };

        return this.sendMail(mailOptions);
    }

    async sendTransactionNotification(email, transactionDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Transaction Notification - ${transactionDetails.type} of ${transactionDetails.currency} ${transactionDetails.amount}`,
            html: getTransactionTemplate(transactionDetails)
        };

        return this.sendMail(mailOptions);
    }

    async sendBillPaymentNotification(email, billDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Bill Payment Confirmation - ${billDetails.billName}`,
            html: getBillPaymentTemplate(billDetails)
        };

        return this.sendMail(mailOptions);
    }

    async sendGoalUpdateNotification(email, goalDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Goal Progress Update - ${goalDetails.goalName}`,
            html: getGoalUpdateTemplate(goalDetails)
        };

        return this.sendMail(mailOptions);
    }

    async sendInvestmentNotification(email, investmentDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Investment Notification - ${investmentDetails.instrumentName}`,
            html: getInvestmentTemplate(investmentDetails)
        };

        return this.sendMail(mailOptions);
    }

    async sendSecurityAlert(email, alertDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Security Alert - BankPro Account',
            html: getSecurityAlertTemplate(alertDetails)
        };

        return this.sendMail(mailOptions);
    }

    async sendLoginOtpEmail(email, name, otpCode) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Your BankPro Login OTP Code',
            html: getLoginOtpTemplate(name, otpCode)
        };

        return this.sendMail(mailOptions);
    }

    getFromEmail() {
        return process.env.SMTP_FROM || process.env.EMAIL_FROM || `noreply@bankpro.com`;
    }

}

module.exports = new EmailService();

