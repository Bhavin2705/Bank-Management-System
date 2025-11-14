# BankPro - Frontend

A modern, responsive banking management system for BankPro built with React and Vite.

## Features

### 🔐 Authentication & Security
- User registration and login
- Password reset functionality
- Secure session management
- Role-based UI (User/Admin)

### 💳 Core Banking Features
- **Dashboard**: Financial overview with charts and statistics
- **Transaction Management**: View, search, and filter transactions
- **Account Management**: Multiple account types and balances
- **Card Management**: Debit/credit card operations
- **Transfer Money**: Inter-account and external transfers
- **Deposit & Withdraw**: Cash operations
- **Bill Payments**: Pay bills and manage recurring payments
- **Budget Planning**: Set and track financial budgets
- **Financial Goals**: Savings goal tracking
- **Investments**: Portfolio management
<!-- Branch Locator removed: single-bank (BankPro) behavior enforced -->
- **Currency Exchange**: Real-time exchange rates
- **Loan Calculator**: EMI calculations
- **Statements**: Generate and download account statements
- **Settings**: Profile and security management

### 📊 Analytics & Reporting
- Interactive charts and graphs
- Transaction analytics
- Financial insights
- PDF report generation

### 🎨 User Experience
- Modern, responsive design
- Dark/Light mode support
- Real-time notifications
- Mobile-first approach
- Accessibility features

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: React Hooks
- **Styling**: Custom CSS with CSS Variables
- **Icons**: Lucide React
- **Charts**: Custom chart components
- **PDF Generation**: jsPDF and html2canvas
- **Notifications**: Custom notification system
- **HTTP Client**: Axios

## Project Structure

```
bank-management-system/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Auth/           # Authentication components
│   │   ├── Dashboard/      # Dashboard components
│   │   ├── Layout/         # Layout components (Navbar, Sidebar)
│   │   ├── NotificationProvider.jsx
│   │   ├── PDFDownloadButton.jsx
│   │   └── UI/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── styles/             # Global styles and themes
│   ├── utils/              # Utility functions
│   │   ├── api.js          # API client
│   │   ├── auth.js         # Authentication utilities
│   │   └── transactions.js # Transaction utilities
│   ├── App.jsx             # Main App component
│   └── main.jsx            # Application entry point
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (see backend README)

### Installation

1. **Clone the repository**
   ```bash
   cd bank-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your backend API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Demo Accounts

- **Admin**: admin@bank.com / admin123
- **User**: user@bank.com / user123

## Deployment

### Environment Variables for Production

```env
VITE_API_URL=https://your-backend-api.onrender.com/api
```

### Vercel Deployment

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Connect your GitHub repository

2. **Deploy**
   - Click "New Project" and select your repository
   - Configure the project:
     - **Framework Preset**: `Vite`
     - **Root Directory**: `bank-management-system`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Set Environment Variables**
   In Vercel dashboard, go to your project → Settings → Environment Variables:
   ```
   VITE_API_URL=https://your-backend-service.onrender.com/api
   ```

4. **Deploy**
   - Vercel will automatically build and deploy your application
   - Your frontend will be available at `https://your-project-name.vercel.app`

### Manual Build and Deploy

```bash
# Build for production
npm run build

# The build artifacts will be stored in the `dist/` directory
# Deploy the `dist` folder to your hosting provider
```

## API Integration

The frontend communicates with the backend API through the following endpoints:

- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/transactions/*` - Transaction operations
- `/api/banks/*` - Bank operations
<!-- /api/branches endpoints removed -->

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Test your changes
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@bankpro.com or create an issue in the repository.
