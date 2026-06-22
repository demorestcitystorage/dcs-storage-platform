# DCS Storage Platform

Backend and frontend for Demorest City Storage and Ellijay Storage unified management system.

## Features

- Unified customer database (both facilities)
- Automated billing and recurring invoices
- Digital lease signing
- Online payment processing (Stripe)
- Automated email and SMS notifications (Twilio)
- Admin dashboard with site map, reporting, and management
- Customer portal for payments and account management
- Waiting list management with auto-notification
- Late fee and lockout automation

## Project Structure

```
dcs-storage-platform/
├── backend/                 # Node.js/Express server
│   ├── routes/             # API route handlers
│   ├── controllers/        # Business logic
│   ├── middleware/         # Express middleware
│   ├── models/             # Database models
│   ├── utils/              # Utility functions
│   ├── server.js           # Main server file
│   ├── database.js         # Database connection
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
│
├── frontend/               # Next.js/React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS/styling
│   │   └── hooks/         # Custom React hooks
│   └── public/            # Static assets
│
├── database/              # Database setup
│   ├── migrations/        # Schema migrations
│   └── seeds/             # Initial data
│
└── .github/              # GitHub workflows (CI/CD)
```

## Prerequisites

- Node.js 18+ (https://nodejs.org/)
- Git (https://git-scm.com/)
- PostgreSQL (local or cloud instance)
- Stripe account (stripe.com)
- Twilio account (twilio.com)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/dcs-storage-platform.git
cd dcs-storage-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with:
- Your PostgreSQL database URL
- Stripe keys (from stripe.com dashboard)
- Twilio credentials (from twilio.com dashboard)
- Email service credentials
- JWT secret (can be any random string)

### 4. Create Database

```bash
# Using PostgreSQL (from terminal, not Node)
createdb dcs_storage

# Then populate schema (when ready - database/migrations/001_init.sql)
psql dcs_storage < ../database/migrations/001_init.sql
```

### 5. Start Backend Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

Test it: Visit `http://localhost:5000/api/health`

You should see: `{ "status": "Server is running", "timestamp": "..." }`

### 6. Frontend Setup (Next Phase)

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## Environment Variables

**Required for backend to run:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default 5000)
- `STRIPE_SECRET_KEY` - From Stripe dashboard
- `TWILIO_ACCOUNT_SID` - From Twilio dashboard
- `TWILIO_AUTH_TOKEN` - From Twilio dashboard
- `JWT_SECRET` - Any random secure string

**Optional but recommended:**
- `STRIPE_PUBLISHABLE_KEY` - For frontend integration
- `SENDGRID_API_KEY` or email service key
- `FRONTEND_URL` - For CORS (default localhost:3000)

## Database Schema

The database schema includes tables for:
- `facilities` - Ellijay and Demorest locations
- `customers` - Unified customer records
- `units` - Individual storage units
- `unit_types` - Unit sizes (10x10, 10x20, etc.)
- `rentals` - Customer rental agreements
- `invoices` - Monthly billing records
- `payments` - Payment transactions
- `waiting_list` - Customers waiting for units
- `communications` - Email/SMS logs
- `automation_log` - Automated action records

See `DCS_Database_Schema.md` for full schema documentation.

## API Endpoints (To Be Built)

### Authentication
- `POST /api/auth/login` - Customer login
- `POST /api/auth/register` - New customer signup
- `POST /api/auth/logout` - Customer logout

### Admin
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/facilities` - All facilities
- `GET /api/admin/customers` - All customers
- `GET /api/admin/units` - All units with status
- `GET /api/admin/reports/past-due` - Past due invoices
- `GET /api/admin/reports/revenue` - Revenue report

### Customers
- `GET /api/customer/profile` - User profile
- `GET /api/customer/rental` - Current rental info
- `GET /api/customer/invoices` - Payment history
- `POST /api/customer/payment` - Make payment
- `PUT /api/customer/autopay` - Enable/disable autopay

### Invoices & Billing
- `POST /api/invoices/create-monthly` - Generate monthly invoices
- `POST /api/invoices/{id}/apply-late-fee` - Apply late fees
- `POST /api/invoices/{id}/lockout` - Lock unit

### Waiting List
- `GET /api/waiting-list` - Active waiting list
- `POST /api/waiting-list/add` - Add to waiting list
- `POST /api/waiting-list/notify` - Notify of availability

## Running Locally

**Terminal 1: Backend Server**
```bash
cd backend
npm run dev
```

**Terminal 2: Frontend App** (when ready)
```bash
cd frontend
npm run dev
```

**Terminal 3: Database** (if using local PostgreSQL)
```bash
# Already running as a service on your machine
```

Then visit:
- Admin Dashboard: `http://localhost:3000/admin` (when built)
- Customer Portal: `http://localhost:3000` (when built)
- API Health: `http://localhost:5000/api/health`

## Next Steps

1. Set up PostgreSQL database locally or on cloud provider (Render, Railway, etc.)
2. Fill in `.env` with your Stripe and Twilio credentials
3. Run `npm run dev` to start the backend
4. Once backend is working, build out the frontend (Next.js React app)

## Deployment

When ready to deploy:
- Frontend → Vercel (zeit.co)
- Backend → Render or Railway
- Database → Render Postgres or similar managed service
- DNS → Point your domains to these services

## Support

For questions or issues, refer to the schema documentation and API endpoint specs.

## License

MIT
