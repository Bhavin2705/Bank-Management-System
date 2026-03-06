const popularBanks = [
    {
        id: 'sbi',
        name: 'State Bank of India',
        bankCode: 'SBIN',
        ifscPrefix: 'SBIN',
        description: 'Largest public sector bank in India'
    },
    {
        id: 'hdfc',
        name: 'HDFC Bank',
        bankCode: 'HDFC',
        ifscPrefix: 'HDFC',
        description: 'Leading private sector bank'
    },
    {
        id: 'icici',
        name: 'ICICI Bank',
        bankCode: 'ICIC',
        ifscPrefix: 'ICIC',
        description: 'International banking and financial services'
    },
    {
        id: 'axis',
        name: 'Axis Bank',
        bankCode: 'UTIB',
        ifscPrefix: 'UTIB',
        description: 'Modern banking solutions'
    },
    {
        id: 'pnb',
        name: 'Punjab National Bank',
        bankCode: 'PUNB',
        ifscPrefix: 'PUNB',
        description: 'Government-owned bank'
    },
    {
        id: 'kotak',
        name: 'Kotak Mahindra Bank',
        bankCode: 'KKBK',
        ifscPrefix: 'KKBK',
        description: 'Innovative banking services'
    },
    {
        id: 'idbi',
        name: 'IDBI Bank',
        bankCode: 'IBKL',
        ifscPrefix: 'IBKL',
        description: 'Development banking institution'
    },
    {
        id: 'federal',
        name: 'Federal Bank',
        bankCode: 'FDRL',
        ifscPrefix: 'FDRL',
        description: 'Progressive banking solutions'
    },
    {
        id: 'indusind',
        name: 'IndusInd Bank',
        bankCode: 'INDB',
        ifscPrefix: 'INDB',
        description: 'Technology-driven banking'
    },
    {
        id: 'yes',
        name: 'Yes Bank',
        bankCode: 'YESB',
        ifscPrefix: 'YESB',
        description: 'Customer-centric banking'
    },
    {
        id: 'bandhan',
        name: 'Bandhan Bank',
        bankCode: 'BDBL',
        ifscPrefix: 'BDBL',
        description: 'Inclusive banking for all'
    }
];

const getBankById = (id) => {
    return popularBanks.find(bank => bank.id === id);
};

const getBankByIFSC = (ifsc) => {
    const prefix = ifsc.substring(0, 4);
    return popularBanks.find(bank => (bank.bankCode || bank.ifscPrefix) === prefix);
};

const getAllBanks = () => {
    return popularBanks;
};

const validateIFSC = (ifsc, bankId) => {
    if (!ifsc || ifsc.length !== 11) return false;

    const bank = getBankById(bankId);
    if (!bank) return false;

    return ifsc.startsWith(bank.bankCode || bank.ifscPrefix);
};

const generateIFSCFromBankCode = (bankCode) => {
    const code = String(bankCode || '').trim().toUpperCase().slice(0, 4);
    if (!/^[A-Z0-9]{4}$/.test(code)) return '';

    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    return `${code}${suffix}`;
};

module.exports = {
    popularBanks,
    getBankById,
    getBankByIFSC,
    getAllBanks,
    validateIFSC,
    generateIFSCFromBankCode
};
