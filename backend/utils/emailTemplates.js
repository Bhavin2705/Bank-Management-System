const getPasswordResetTemplate = (resetUrl) => `
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

const getWelcomeTemplate = (name) => `
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
                            <div class="feature">âœ“ Manage multiple bank accounts</div>
                            <div class="feature">âœ“ Track transactions and budgets</div>
                            <div class="feature">âœ“ Pay bills easily and securely</div>
                            <div class="feature">âœ“ Set and monitor financial goals</div>
                            <div class="feature">âœ“ Monitor investments</div>
                            <div class="feature">âœ“ Exchange currencies</div>
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

const getAccountCreatedTemplate = (name, accountNumber) => `
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

const getTransactionTemplate = (details) => {
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
};

const getLoginOtpTemplate = (name, otpCode) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a237e; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
                    .otp-box {
                        font-size: 28px;
                        letter-spacing: 6px;
                        font-weight: 700;
                        text-align: center;
                        background: #ffffff;
                        padding: 14px;
                        border-radius: 8px;
                        margin: 16px 0;
                        border: 1px solid #d1d5db;
                    }
                    .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Login Verification Code</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${name || 'User'},</p>
                        <p>Use this one-time password to complete your login:</p>
                        <div class="otp-box">${otpCode}</div>
                        <div class="warning">
                            <strong>Security notice:</strong> This OTP is valid for 10 minutes and can be used only once.
                        </div>
                        <p>If you did not request this login, change your password immediately.</p>
                        <p>BankPro Security Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

const getBillPaymentTemplate = (details) => `
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
                        <p><span class="success-badge">âœ“ Payment Successful</span></p>
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

const getGoalUpdateTemplate = (details) => {
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
};

const getInvestmentTemplate = (details) => {
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
};

const getSecurityAlertTemplate = (details) => `
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
                        <strong>âš ï¸ Unusual Activity Detected</strong>
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

module.exports = {
    getPasswordResetTemplate,
    getWelcomeTemplate,
    getAccountCreatedTemplate,
    getTransactionTemplate,
    getLoginOtpTemplate,
    getBillPaymentTemplate,
    getGoalUpdateTemplate,
    getInvestmentTemplate,
    getSecurityAlertTemplate
};
