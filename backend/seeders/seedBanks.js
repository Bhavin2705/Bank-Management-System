const mongoose = require('mongoose');
const { popularBanks } = require('../utils/banks');
const Bank = require('../models/Bank');
const connectDB = require('../config/database');
const { loadEnv, validateEnv } = require('../config');

loadEnv();
validateEnv();
connectDB();

const seedBanks = async () => {
    try {
        await Bank.deleteMany();

        await Bank.insertMany(popularBanks);

        console.log('Banks seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding banks:', error);
        process.exit(1);
    }
};

seedBanks();
