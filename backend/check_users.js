const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const users = await User.find({}).select('+password');
        console.log('Total users:', users.length);

        users.forEach((user, index) => {
            console.log(`\nUser ${index + 1}:`);
            console.log(`  ID: ${user._id}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Phone: ${user.phone}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Account Number: ${user.accountNumber}`);
            console.log(`  Password Hash: ${user.password ? 'Set' : 'Not Set'}`);
            console.log(`  Balance: ${user.balance}`);
        });

        // Try to find admin user specifically
        const adminUser = await User.findOne({ email: 'admin@bankpro.com' }).select('+password');
        if (adminUser) {
            console.log('\n=== ADMIN USER FOUND ===');
            console.log('Email:', adminUser.email);
            console.log('Role:', adminUser.role);
            console.log('Password hash exists:', !!adminUser.password);

            // Test password comparison
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare('Admin@123', adminUser.password);
            console.log('Password "Admin@123" matches:', isMatch);
        } else {
            console.log('\n=== NO ADMIN USER FOUND ===');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
};

checkUsers();