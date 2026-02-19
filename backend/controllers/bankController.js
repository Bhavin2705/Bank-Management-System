const Bank = require('../models/Bank');

exports.getBanks = async (req, res) => {
    try {
        const banks = await Bank.find();
        res.status(200).json({ success: true, data: banks });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch banks' });
    }
};

exports.addBank = async (req, res) => {
    try {
        const { name, ifscPrefix, description } = req.body;

        if (!name || !ifscPrefix || !description) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const bank = new Bank({ name, ifscPrefix, description });
        await bank.save();

        res.status(201).json({ success: true, data: bank });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to add bank' });
    }
};

exports.deleteBank = async (req, res) => {
    try {
        const bank = await Bank.findByIdAndDelete(req.params.id);

        if (!bank) {
            return res.status(404).json({ success: false, error: 'Bank not found' });
        }

        res.status(200).json({ success: true, message: 'Bank deleted successfully' });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to delete bank' });
    }
};
