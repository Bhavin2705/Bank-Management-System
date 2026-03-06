const parsePort = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getEmailConfig = () => {
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpPort = parsePort(process.env.SMTP_PORT || process.env.EMAIL_PORT, 587);
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const smtpSecure = process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : smtpPort === 465;

    return {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        smtpFrom: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@bankpro.com',
        timeouts: {
            connection: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
            greeting: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
            socket: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000)
        }
    };
};

module.exports = {
    getEmailConfig
};
