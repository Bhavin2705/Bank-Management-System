const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered
const User = require('./models/User');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const Bill = require('./models/Bill');
const Budget = require('./models/Budget');
const Card = require('./models/Card');
const Goal = require('./models/Goal');
const Investment = require('./models/Investment');
const Notification = require('./models/Notification');
const RecurringPayment = require('./models/RecurringPayment');

const clearDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all collection names
        const collections = mongoose.connection.db.listCollections();
        const collectionNames = [];

        for await (const collection of collections) {
            collectionNames.push(collection.name);
        }

        console.log('📋 Found collections:', collectionNames);

        // Clear each collection
        const models = [
            { name: 'Users', model: User },
            { name: 'Accounts', model: Account },
            { name: 'Transactions', model: Transaction },
            { name: 'Bills', model: Bill },
            { name: 'Budgets', model: Budget },
            { name: 'Cards', model: Card },
            { name: 'Goals', model: Goal },
            { name: 'Investments', model: Investment },
            { name: 'Notifications', model: Notification },
            { name: 'RecurringPayments', model: RecurringPayment }
        ];

        for (const { name, model } of models) {
            try {
                const result = await model.deleteMany({});
                console.log(`🗑️  Cleared ${result.deletedCount} documents from ${name}`);
            } catch (error) {
                console.log(`⚠️  Could not clear ${name}: ${error.message}`);
            }
        }

        console.log('🎉 Database cleared successfully!');
        console.log('📊 All user accounts, transactions, and related data have been removed.');

    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

// Confirmation prompt
console.log('⚠️  WARNING: This will permanently delete ALL data from the database!');
console.log('📋 This includes:');
console.log('   - User accounts');
console.log('   - Transaction history');
console.log('   - Account information');
console.log('   - Bills, budgets, cards');
console.log('   - Goals, investments');
console.log('   - Notifications and recurring payments');
console.log('');
console.log('❓ Are you sure you want to continue? (y/N): ');

// Run the script
clearDatabase();
