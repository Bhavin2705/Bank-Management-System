const mongoose = require('mongoose');

const connectDB = async () => {
    // Use provided MONGODB_URI or fall back to a local MongoDB instance for development.
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bank_management_system';

    try {
        // Connect to MongoDB with explicit dbName for clarity
        const conn = await mongoose.connect(mongoURI, { dbName: 'bank_management_system' });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`MongoDB Database: ${conn.connection.name}`);
        if (!process.env.MONGODB_URI) {
            console.warn('Warning: MONGODB_URI not set. Connected to local fallback:', mongoURI);
        }
    } catch (error) {
        console.error('Database connection error:', error.message);
        console.error('Tried to connect to:', mongoURI);
        console.error('Set the MONGODB_URI environment variable to a valid MongoDB connection string.');
        process.exit(1);
    }
};

module.exports = connectDB;
