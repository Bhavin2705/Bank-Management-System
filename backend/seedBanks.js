require('dotenv').config();

const mongoose = require('mongoose');
const { popularBanks } = require('./utils/banks');
const Bank = require('./models/Bank'); // Assuming you have a Bank model
const connectDB = require('./config/database');

// Connect to the database
connectDB();

const seedBanks = async () => {
    try {
        // Clear existing banks
        await Bank.deleteMany();

        // Insert popular banks
        await Bank.insertMany(popularBanks);

        console.log('Banks seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding banks:', error);
        process.exit(1);
    }
};

seedBanks();