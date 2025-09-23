const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@bankpro.com' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        // Create admin user
        const adminUser = await User.create({
            name: 'System Administrator',
            email: 'admin@bankpro.com',
            phone: '9999999999',
            password: 'Admin@123', // This will be hashed by the pre-save middleware
            role: 'admin',
            balance: 100000, // Starting balance for admin
            accountNumber: 'ACC-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase(),
            profile: {
                occupation: 'System Administrator',
                income: 0
            },
            preferences: {
                currency: 'INR',
                language: 'en',
                theme: 'light'
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Password: Admin@123`);
        console.log(`   Account Number: ${adminUser.accountNumber}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Balance: ₹${adminUser.balance}`);

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        process.exit(0);
    }
};

createAdmin();