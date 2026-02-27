require('dotenv').config();

const mongoose = require('mongoose');
const { popularBanks } = require('./utils/banks');
const Bank = require('./models/Bank'); // Assuming you have a Bank model
const connectDB = require('./config/database');

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
