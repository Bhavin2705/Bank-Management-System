const popularBanks = [
    {
        id: 'bankpro',
        name: 'BankPro',
        ifscPrefix: 'BANK',
        description: 'Our primary banking system'
    },
    {
        id: 'sbi',
        name: 'State Bank of India',
        ifscPrefix: 'SBIN',
        description: 'Largest public sector bank in India'
    },
    {
        id: 'hdfc',
        name: 'HDFC Bank',
        ifscPrefix: 'HDFC',
        description: 'Leading private sector bank'
    },
    {
        id: 'icici',
        name: 'ICICI Bank',
        ifscPrefix: 'ICIC',
        description: 'International banking and financial services'
    },
    {
        id: 'axis',
        name: 'Axis Bank',
        ifscPrefix: 'UTIB',
        description: 'Modern banking solutions'
    },
    {
        id: 'pnb',
        name: 'Punjab National Bank',
        ifscPrefix: 'PUNB',
        description: 'Government-owned bank'
    },
    {
        id: 'kotak',
        name: 'Kotak Mahindra Bank',
        ifscPrefix: 'KKBK',
        description: 'Innovative banking services'
    },
    {
        id: 'idbi',
        name: 'IDBI Bank',
        ifscPrefix: 'IBKL',
        description: 'Development banking institution'
    },
    {
        id: 'federal',
        name: 'Federal Bank',
        ifscPrefix: 'FDRL',
        description: 'Progressive banking solutions'
    },
    {
        id: 'indusind',
        name: 'IndusInd Bank',
        ifscPrefix: 'INDB',
        description: 'Technology-driven banking'
    },
    {
        id: 'yes',
        name: 'Yes Bank',
        ifscPrefix: 'YESB',
        description: 'Customer-centric banking'
    },
    {
        id: 'bandhan',
        name: 'Bandhan Bank',
        ifscPrefix: 'BDBL',
        description: 'Inclusive banking for all'
    }
];

const getBankById = (id) => {
    return popularBanks.find(bank => bank.id === id);
};

const getBankByIFSC = (ifsc) => {
    const prefix = ifsc.substring(0, 4);
    return popularBanks.find(bank => bank.ifscPrefix === prefix);
};

const getAllBanks = () => {
    return popularBanks;
};

const validateIFSC = (ifsc, bankId) => {
    if (!ifsc || ifsc.length !== 11) return false;

    const bank = getBankById(bankId);
    if (!bank) return false;

    return ifsc.startsWith(bank.ifscPrefix);
};

module.exports = {
    popularBanks,
    getBankById,
    getBankByIFSC,
    getAllBanks,
    validateIFSC
};
