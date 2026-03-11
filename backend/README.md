# BankPro Backend API

Backend REST API and Socket.IO server for the BankPro banking platform, built with Node.js, Express, and MongoDB.

## Overview

This service provides:

- JWT authentication with refresh token support
- User profile and security settings management
- Transactions and transfers
- Cards, bills, budgets, and recurring payments
- Bank directory management
- Notifications
- Currency rates and conversion utilities
- Real-time socket events (when enabled)

## Tech Stack

- Runtime: Node.js
- Framework: Express 4
- Database: MongoDB with Mongoose
- Auth: JWT + refresh tokens
- Realtime: Socket.IO
- Validation: express-validator
- Security middleware: helmet, cors, rate limiting, mongo sanitize, xss-clean, hpp
- Email: Nodemailer
- Testing: Jest + Supertest

## Project Structure

```text
backend/
|- app.js
|- server.js
|- config/
|- controllers/
|- middleware/
|- models/
|- routes/
|- services/
|- socket/
|- tests/
|- validations/
|- utils/
`- seeders/
```

## Prerequisites

- Node.js 18 or later recommended
- MongoDB instance (local or cloud)
- npm

## Installation

1. Change into backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create an environment file:

```bash
cp .env.example .env
```

If `.env.example` is not present in your local copy, create `.env` manually.

4. Add required environment variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bank_management_system
JWT_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
FRONTEND_URL=http://localhost:5173
```

5. Optional email configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_SECURE=false
SMTP_FROM=noreply@bankpro.com
```

6. Start the server:

```bash
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Environment Notes

- `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are required.
- CORS accepts `FRONTEND_URL` and optional comma-separated `FRONTEND_URLS`.
- Set `ALLOW_VERCEL_PREVIEWS=true` to allow `*.vercel.app` preview origins.
- Set `SUPPORT_CHAT_ENABLED=true` to activate socket chat/event handlers.
- Set `OPEN_EXCHANGE_RATES_API_KEY` for live exchange rates (fallback static rates are used otherwise).

## Health Check

- `GET /health` returns service status, timestamp, environment, and email service state.

## API Routes

Base path: `/api`

### Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /login-account`
- `POST /forgotpassword`
- `GET /resetpassword/:resettoken`
- `PUT /resetpassword/:resettoken`
- `POST /refresh`
- `POST /logout` (auth required)
- `GET /me` (auth required)
- `PUT /updatedetails` (auth required)
- `PUT /updatepassword` (auth required)

### Users (`/api/users`)

- `GET /banks` (public)
- `GET /check-email` (public)
- `GET /check-phone` (public)
- `POST /verify-pin` (auth required)
- `PUT /update-pin` (auth required)
- `GET /me/client-data` (auth required)
- `PUT /me/client-data` (auth required)
- `GET /transfer-recipients` (auth required)
- `GET /stats` (admin)
- `GET /admin-actions` (admin)
- `GET /bank-metrics` (admin)
- `GET /` (admin)
- `PUT /:id/status` (admin)
- `GET /:id` (auth required)
- `PUT /:id` (auth required)

### Transactions (`/api/transactions`) (auth required)

- `GET /categories`
- `GET /stats`
- `POST /validate-transfer`
- `POST /transfer`
- `GET /`
- `POST /`
- `GET /admin/user/:id` (admin)
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

### Cards (`/api/cards`) (auth required)

- `GET /`
- `GET /admin/user/:id` (admin)
- `POST /`
- `PUT /:id/pin`
- `PUT /:id/status`
- `POST /:id/status-request`
- `PUT /:id/status-request` (admin)
- `POST /:id/reveal-cvv`

### Bills (`/api/bills`) (auth required)

- `GET /`
- `GET /stats`
- `GET /:id`
- `POST /`
- `POST /:id/pay`
- `PUT /:id`
- `DELETE /:id`

### Budgets (`/api/budgets`) (auth required)

- `GET /`
- `GET /summary`
- `GET /stats`
- `GET /:id`
- `POST /`
- `POST /:id/update-spent`
- `PUT /:id`
- `DELETE /:id`

### Recurring (`/api/recurring`) (auth required)

- `GET /`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

### Notifications (`/api/notifications`) (auth required)

- `GET /`
- `GET /:id`
- `PUT /:id/read`
- `PUT /read-all`
- `POST /mark-all-read`
- `DELETE /:id`
- `DELETE /`

### Banks (`/api/banks`)

- `GET /` (public)
- `POST /` (admin)
- `PUT /:id` (admin)
- `DELETE /:id` (admin)

### Exchange (`/api/exchange`)

- `GET /rates`
- `POST /convert`

### Settings (`/api/settings`) (auth required)

- `GET /`
- `PUT /preferences`
- `PUT /two-factor`
- `GET /linked-accounts`
- `GET /sessions`

## NPM Scripts

- `npm start` - Start server with Node
- `npm run dev` - Start server with Node (same as start in current config)
- `npm test` - Run Jest tests
- `npm run seed:admin` - Seed admin user
- `npm run seed:banks` - Seed bank data
- `npm run seed` - Run all seeders
- `npm run init` - Configured in `package.json`, but currently expects `init.js` (not present)

## Testing

Integration tests are available under `tests/integration` and include:

- health endpoint
- auth flows
- user flows
- transaction flows
- error handling paths

Run:

```bash
npm test
```

## Security and Reliability

- Global error handling with consistent JSON response format
- Route-level validation middleware
- Multiple rate-limit profiles (`auth`, `lookup`, `transaction`, `settings`, `pin`)
- CORS origin allow-list controls
- MongoDB operator sanitization and XSS protection
- Helmet headers and HPP protection

## License

ISC (as defined in `package.json`)
