# Bank Management System - Backend API

A comprehensive REST API for a banking management system built with Node.js, Express, and MongoDB.

## Features

### 🔐 Authentication & Authorization
- User registration and login
- JWT-based authentication
- Password reset functionality
- Role-based access control (User/Admin)
- Refresh token support

### 💳 Core Banking Features
- **User Management**: Complete user profiles with KYC information
- **Transaction Processing**: Credit, debit, and transfer operations
- **Account Management**: Multiple account types (Savings, Checking, Business, etc.)
- **Card Management**: Debit/credit card operations with security features
- **Investment Portfolio**: Stock, mutual fund, and other investment tracking
- **Budget Planning**: Financial goal setting and budget management
- **Bill Payments**: Automated bill payment system
- **Recurring Payments**: Scheduled payment processing

### 🛡️ Security Features
- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- Input validation and sanitization
- CORS protection
- Helmet security headers
- XSS and NoSQL injection protection

### 📊 Analytics & Reporting
- Transaction history and analytics
- Financial insights and reporting
- User activity monitoring
- Performance metrics

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, helmet, cors, express-rate-limit
- **Validation**: express-validator
- **File Upload**: multer (planned)
- **Email**: nodemailer (planned)

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── transactionController.js  # Transaction operations
│   └── userController.js    # User management (Admin)
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── cors.js             # CORS configuration
│   ├── errorHandler.js     # Global error handling
│   ├── rateLimit.js        # Rate limiting
│   └── validation.js       # Input validation
├── models/
│   ├── User.js             # User schema
│   ├── Transaction.js      # Transaction schema
│   ├── Account.js          # Account schema
│   ├── Card.js             # Card schema
│   ├── Investment.js       # Investment schema
│   ├── Budget.js           # Budget schema
│   ├── Goal.js             # Financial goals schema
│   ├── Bill.js             # Bill payment schema
│   ├── Notification.js     # Notification schema
│   └── RecurringPayment.js # Recurring payment schema
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management routes
│   └── transactions.js     # Transaction routes
├── utils/                  # Utility functions
├── server.js               # Main server file
├── package.json            # Dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bank_management
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:token` - Reset password
- `POST /api/auth/refresh` - Refresh access token

### Users (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/stats` - Get user statistics
- `PUT /api/users/:id/role` - Update user role
- `PUT /api/users/:id/status` - Update user status

### Transactions
- `GET /api/transactions` - Get user transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats` - Get transaction statistics
- `GET /api/transactions/categories` - Get transaction categories
- `POST /api/transactions/transfer` - Transfer money

## Data Models

### User Model
```javascript
{
  name: String,
  email: String,
  phone: String,
  password: String, // Hashed
  role: 'user' | 'admin',
  accountNumber: String,
  balance: Number,
  profile: Object,
  security: Object,
  preferences: Object,
  status: String
}
```

### Transaction Model
```javascript
{
  userId: ObjectId,
  type: 'credit' | 'debit' | 'transfer',
  amount: Number,
  balance: Number,
  description: String,
  category: String,
  status: String,
  recipientId: ObjectId,
  reference: String
}
```

## Security Features

- **Password Security**: Bcrypt hashing with 12 rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Protection**: Configured CORS policies
- **Security Headers**: Helmet.js for security headers
- **Data Sanitization**: Protection against XSS and NoSQL injection

## Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "error": "Error message",
  "details": [] // Validation errors
}
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Code Style

- Use ESLint for code linting
- Follow consistent naming conventions
- Add JSDoc comments for functions
- Use async/await for asynchronous operations

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://username:password@host:port/database
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### PM2 Deployment

```bash
npm install -g pm2
pm2 start server.js --name "bank-api"
pm2 startup
pm2 save
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@bankpro.com or create an issue in the repository.
