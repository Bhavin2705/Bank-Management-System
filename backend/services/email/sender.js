const nodemailer = require('nodemailer');
const { getEmailConfig } = require('./config');

class EmailSender {
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
            const cfg = getEmailConfig();

            if (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
                this.transporter = nodemailer.createTransport({
                    host: cfg.smtpHost,
                    port: cfg.smtpPort,
                    secure: cfg.smtpSecure,
                    family: 4,
                    connectionTimeout: cfg.timeouts.connection,
                    greetingTimeout: cfg.timeouts.greeting,
                    socketTimeout: cfg.timeouts.socket,
                    auth: {
                        user: cfg.smtpUser,
                        pass: cfg.smtpPass
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
                return;
            }

            this.lastVerification = {
                ok: false,
                message: 'Missing SMTP/EMAIL environment variables',
                checkedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Email sender initialization error:', error.message);
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

    async send(mailOptions) {
        return this.transporter.sendMail(mailOptions);
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
}

module.exports = new EmailSender();
