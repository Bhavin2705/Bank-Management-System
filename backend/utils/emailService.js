const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = process.env.SMTP_PORT;
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;
            const smtpSecure = process.env.SMTP_SECURE === 'true';

            if (smtpHost && smtpUser && smtpPass) {
                this.transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: smtpPort ? parseInt(smtpPort, 10) : 587,
                    secure: smtpSecure,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });
                this.initialized = true;
            }
        } catch (error) {
            console.error('Email service initialization error:', error.message);
            this.initialized = false;
        }
    }

    isConfigured() {
        return this.initialized && this.transporter;
    }

    async sendPasswordResetEmail(email, resetUrl) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Password Reset Request - BankPro',
            html: this.getPasswordResetTemplate(resetUrl)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendWelcomeEmail(email, name) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Welcome to BankPro - Your Account is Ready',
            html: this.getWelcomeTemplate(name)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendAccountCreatedEmail(email, name, accountNumber) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Account Successfully Created - BankPro',
            html: this.getAccountCreatedTemplate(name, accountNumber)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendTransactionNotification(email, transactionDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Transaction Notification - ${transactionDetails.type} of ${transactionDetails.currency} ${transactionDetails.amount}`,
            html: this.getTransactionTemplate(transactionDetails)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendBillPaymentNotification(email, billDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Bill Payment Confirmation - ${billDetails.billName}`,
            html: this.getBillPaymentTemplate(billDetails)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendGoalUpdateNotification(email, goalDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Goal Progress Update - ${goalDetails.goalName}`,
            html: this.getGoalUpdateTemplate(goalDetails)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendInvestmentNotification(email, investmentDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: `Investment Notification - ${investmentDetails.instrumentName}`,
            html: this.getInvestmentTemplate(investmentDetails)
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendSecurityAlert(email, alertDetails) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.getFromEmail(),
            to: email,
            subject: 'Security Alert - BankPro Account',
            html: this.getSecurityAlertTemplate(alertDetails)
        };

        return this.transporter.sendMail(mailOptions);
    }

    getFromEmail() {
        return process.env.EMAIL_FROM || `noreply@bankpro.com`;
    }

    getPasswordResetTemplate(resetUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .button { display: inline-block; background-color: #1a237e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                    .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Password Reset Request</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>We received a request to reset your BankPro account password. Click the button below to proceed:</p>
                        <a href="${resetUrl}" class="button">Reset Password</a>
                        <p>Or copy this link: <br><small>${resetUrl}</small></p>
                        <div class="warning">
                            <strong>Note:</strong> This link will expire in 10 minutes.
                        </div>
                        <p>If you did not request a password reset, please ignore this email. Your account remains secure.</p>
                        <p>Best regards,<br>BankPro Security Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getWelcomeTemplate(name) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .feature-list { margin: 15px 0; }
                    .feature { padding: 10px; margin: 5px 0; background-color: white; border-left: 4px solid #1a237e; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Welcome to BankPro</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${name},</p>
                        <p>Thank you for joining BankPro! We're excited to have you on board.</p>
                        <p><strong>Key Features You Can Now Access:</strong></p>
                        <div class="feature-list">
                            <div class="feature">✓ Manage multiple bank accounts</div>
                            <div class="feature">✓ Track transactions and budgets</div>
                            <div class="feature">✓ Pay bills easily and securely</div>
                            <div class="feature">✓ Set and monitor financial goals</div>
                            <div class="feature">✓ Monitor investments</div>
                            <div class="feature">✓ Exchange currencies</div>
                        </div>
                        <p>Start exploring your dashboard to make the most of BankPro.</p>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getAccountCreatedTemplate(name, accountNumber) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Account Created Successfully</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${name},</p>
                        <p>Congratulations! Your BankPro account has been successfully created.</p>
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Account Number:</strong></span>
                                <span>${accountNumber}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Status:</strong></span>
                                <span>Active</span>
                            </div>
                        </div>
                        <p>You can now log in to your account and start managing your finances.</p>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getTransactionTemplate(details) {
        const actionWord = details.type === 'credit' ? 'Received' : 'Sent';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .amount { font-size: 24px; font-weight: bold; color: ${details.type === 'credit' ? '#4caf50' : '#f44336'}; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Transaction Notification</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>${actionWord} ${details.currency} <span class="amount">${details.amount}</span></p>
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Type:</strong></span>
                                <span>${details.type.charAt(0).toUpperCase() + details.type.slice(1)}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Amount:</strong></span>
                                <span>${details.currency} ${details.amount}</span>
                            </div>
                            ${details.description ? `<div class="detail-row">
                                <span><strong>Description:</strong></span>
                                <span>${details.description}</span>
                            </div>` : ''}
                            <div class="detail-row">
                                <span><strong>Date & Time:</strong></span>
                                <span>${new Date(details.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getBillPaymentTemplate(details) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .success-badge { background-color: #4caf50; color: white; padding: 8px 16px; border-radius: 5px; display: inline-block; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Bill Payment Confirmation</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p><span class="success-badge">✓ Payment Successful</span></p>
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Bill:</strong></span>
                                <span>${details.billName}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Amount:</strong></span>
                                <span>${details.currency} ${details.amount}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Reference:</strong></span>
                                <span>${details.referenceNumber}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Date:</strong></span>
                                <span>${new Date(details.date).toLocaleString()}</span>
                            </div>
                        </div>
                        <p>Keep this email for your records.</p>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getGoalUpdateTemplate(details) {
        const percentage = Math.round((details.currentAmount / details.targetAmount) * 100);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .progress-bar { background-color: #e0e0e0; border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden; }
                    .progress-fill { background-color: #4caf50; height: 100%; width: ${percentage}%; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Goal Progress Update</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your goal "<strong>${details.goalName}</strong>" is progressing well!</p>
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Goal:</strong></span>
                                <span>${details.goalName}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Progress:</strong></span>
                                <span>${percentage}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="detail-row">
                                <span><strong>Current Amount:</strong></span>
                                <span>${details.currency} ${details.currentAmount}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Target Amount:</strong></span>
                                <span>${details.currency} ${details.targetAmount}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Remaining:</strong></span>
                                <span>${details.currency} ${details.targetAmount - details.currentAmount}</span>
                            </div>
                        </div>
                        <p>Keep up the great work towards your financial goal!</p>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getInvestmentTemplate(details) {
        const changeColor = details.change >= 0 ? '#4caf50' : '#f44336';
        const changeSymbol = details.change >= 0 ? '+' : '';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .change { color: ${changeColor}; font-weight: bold; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Investment Update</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Here's an update on your investment.</p>
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Investment:</strong></span>
                                <span>${details.instrumentName}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Current Value:</strong></span>
                                <span>${details.currency} ${details.currentValue}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Change:</strong></span>
                                <span class="change">${changeSymbol}${details.currency} ${details.change}</span>
                            </div>
                            ${details.percentage ? `<div class="detail-row">
                                <span><strong>Change %:</strong></span>
                                <span class="change">${changeSymbol}${details.percentage}%</span>
                            </div>` : ''}
                            <div class="detail-row">
                                <span><strong>Last Updated:</strong></span>
                                <span>${new Date(details.updatedAt).toLocaleString()}</span>
                            </div>
                        </div>
                        <p>Best regards,<br>BankPro Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getSecurityAlertTemplate(details) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .alert-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0; }
                    .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .detail-row:last-child { border-bottom: none; }
                    .button { display: inline-block; background-color: #d32f2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Security Alert</h2>
                    </div>
                    <div class="alert-box">
                        <strong>⚠️ Unusual Activity Detected</strong>
                        <p>We noticed unusual activity on your account. Please review the details below.</p>
                    </div>
                    <div class="content">
                        <div class="details">
                            <div class="detail-row">
                                <span><strong>Alert Type:</strong></span>
                                <span>${details.alertType}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Activity:</strong></span>
                                <span>${details.activity}</span>
                            </div>
                            <div class="detail-row">
                                <span><strong>Date & Time:</strong></span>
                                <span>${new Date(details.timestamp).toLocaleString()}</span>
                            </div>
                            ${details.location ? `<div class="detail-row">
                                <span><strong>Location:</strong></span>
                                <span>${details.location}</span>
                            </div>` : ''}
                        </div>
                        <p><strong>If this wasn't you:</strong></p>
                        <a href="#" class="button">Secure Your Account</a>
                        <p>If you have any questions or concerns, please contact our support team immediately.</p>
                        <p>Best regards,<br>BankPro Security Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new EmailService();
