const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        console.error('MONGODB_URI environment variable is not set');
        console.error('Please set MONGODB_URI to a valid MongoDB connection string');
        console.error('Example: mongodb+srv://username:password@cluster.mongodb.net/database');
        process.exit(1);
    }

    try {
        // Connect to MongoDB with explicit dbName for clarity
        const conn = await mongoose.connect(mongoURI, {
            dbName: 'bank_management_system'
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`MongoDB Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('Database connection error:', error.message);
        console.error('Tried to connect to:', mongoURI);
        console.error('Please check your MongoDB connection string and network access');
        process.exit(1);
    }
};

module.exports = connectDB;
