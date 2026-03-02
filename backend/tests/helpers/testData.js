const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const randomPhone = () => {
    const digits = `${Math.floor(Math.random() * 1e9)}`.padStart(9, '0');
    return `9${digits}`;
};

const buildUserPayload = (overrides = {}) => {
    const suffix = uniqueSuffix();

    return {
        name: 'Test User',
        email: `tester.${suffix}@example.com`,
        phone: randomPhone(),
        password: 'Test@1234',
        pin: '1234',
        initialDeposit: 2000,
        ...overrides
    };
};

module.exports = {
    buildUserPayload
};
