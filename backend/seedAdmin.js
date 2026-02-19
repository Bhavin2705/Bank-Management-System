const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/database');
require('dotenv').config();

connectDB();

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        const adminData = {
            name: 'Admin',
            email: 'admin@bankpro.com',
            password: 'Admin@123',
            phone: '7813765432',
            accountNumber: '97612743981',
            role: 'admin'
        };

        await User.create(adminData);

        console.log('Admin user created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin user:', error);
        process.exit(1);
    }
};

seedAdmin();
