// const mongoose = require('mongoose');
// const User = require('./models/User');
// require('dotenv').config();

// // Connect to database
// const connectDB = async () => {
//     try {
//     // await mongoose.connect(process.env.MONGODB_URI);
//     // console.log('MongoDB Connected for initialization');
//     } catch (error) {
//         console.error('Database connection error:', error.message);
//         process.exit(1);
//     }
// };

// // Initialize database
// const initializeDB = async () => {
//     try {
//         // Check if any users exist
//         const userCount = await User.countDocuments();

//         if (userCount === 0) {
//             // Create default admin user
//             const adminUser = await User.create({
//                 name: 'System Administrator',
//                 email: 'admin@bankpro.com',
//                 phone: '9999999999',
//                 password: 'Admin@123', // This will be hashed by the pre-save middleware
//                 role: 'admin',
//                 balance: 100000, // Starting balance for admin
//                 profile: {
//                     occupation: 'System Administrator',
//                     income: 0
//                 },
//                 preferences: {
//                     currency: 'INR',
//                     language: 'en',
//                     theme: 'light'
//                 }
//             });

//             console.log('✅ Default admin user created:');
//             console.log(`   Email: ${adminUser.email}`);
//             console.log(`   Password: Admin@123`);
//             console.log(`   Account Number: ${adminUser.accountNumber}`);
//             console.log(`   Role: ${adminUser.role}`);
//         } else {
//             console.log('ℹ️  Database already initialized with users');
//         }

//         // Create indexes for better performance
//         console.log('🔧 Creating database indexes...');

//         // Drop the unique index on phone if it exists (to allow multiple accounts per phone)
//         try {
//             await User.collection.dropIndex('phone_1');
//             console.log('✅ Dropped unique phone index');
//         } catch (error) {
//             // Index might not exist, which is fine
//             console.log('ℹ️  Phone unique index not found (already removed or never existed)');
//         }

//         await User.collection.createIndex({ role: 1 });

//         console.log('✅ Database indexes updated');

//     } catch (error) {
//         console.error('❌ Database initialization error:', error.message);
//         process.exit(1);
//     }
// };

// // Run initialization
// const runInit = async () => {
//     await connectDB();
//     await initializeDB();
//     console.log('🎉 Database initialization completed');
//     process.exit(0);
// };

// runInit();
