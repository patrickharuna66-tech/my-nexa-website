# NexaHost — Web Hosting Reseller Platform

Full-stack hosting reseller website powered by InMotion Hosting (WHM/cPanel).

## Project Structure

```
nexahost/
├── frontend/           # Static HTML/CSS/JS frontend
│   ├── index.html      # Landing page
│   ├── css/
│   │   ├── main.css    # Global styles
│   │   ├── landing.css # Landing page styles
│   │   └── dashboard.css
│   ├── js/
│   │   ├── main.js     # Shared JS (auth, toast, API helper)
│   │   ├── landing.js  # Landing page interactions
│   │   ├── customer-dashboard.js
│   │   └── admin-dashboard.js
│   └── pages/
│       ├── login.html
│       ├── signup.html
│       ├── customer-dashboard.html
│       └── admin-dashboard.html
├── backend/            # Node.js + Express API
│   ├── server.js       # Entry point
│   ├── config/db.js    # PostgreSQL pool
│   ├── middleware/auth.js
│   ├── routes/         # auth, customer, admin, webhooks, public
│   ├── controllers/    # authController, customerController, adminController, webhookController
│   └── utils/          # email.js, whm.js
└── database/
    ├── schema.sql      # Full DB schema
    ├── migrate.js      # Run migration
    └── seed.js         # Seed demo data
```

## Quick Start

### 1. Set Up Database (PostgreSQL)

```bash
# Create database and user
psql -U postgres
CREATE USER nexahost_user WITH PASSWORD 'your_password';
CREATE DATABASE nexahost OWNER nexahost_user;
GRANT ALL PRIVILEGES ON DATABASE nexahost TO nexahost_user;
\q

# Run migration
cd database
node migrate.js

# Seed demo data
node seed.js
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your values (DB credentials, WHM API, SMTP, payment keys)
npm install
npm run dev        # Development
npm start          # Production
```

### 3. Serve Frontend

The backend serves the frontend as static files automatically.
Access at: http://localhost:5000

For development with live reload, use VS Code Live Server on the frontend folder,
then update API_BASE in each JS file to http://localhost:5000/api.

### 4. Test Login

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@nexahost.com     | admin123     |
| Customer | jane@example.com       | customer123  |

## Deployment (Render / Railway / VPS)

### Render (recommended)
1. Create a PostgreSQL database on Render
2. Create a Web Service pointing to `backend/` with start command `npm start`
3. Set all environment variables from `.env.example`
4. Deploy. The backend serves the frontend automatically.

### VPS (Ubuntu)
```bash
# Install Node 18+, PostgreSQL
sudo apt update && sudo apt install -y nodejs npm postgresql

# Clone project, install deps
cd backend && npm install

# Run with PM2
npm install -g pm2
pm2 start server.js --name nexahost
pm2 save && pm2 startup
```

## InMotion WHM Integration

1. Log into your InMotion reseller cPanel → WHM
2. Go to Development → Manage API Tokens
3. Create a token and copy to `.env` as `WHM_TOKEN`
4. Create hosting packages in WHM named:
   - `nexahost_starter`
   - `nexahost_business`  
   - `nexahost_pro`

## Payment Integration

### Stripe
1. Create account at stripe.com
2. Get API keys from Dashboard → Developers → API Keys
3. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. Add `invoice.payment_succeeded` and `customer.subscription.deleted` events

### Flutterwave
1. Create account at flutterwave.com
2. Get keys from Dashboard → Settings → API Keys
3. Set webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`

## API Endpoints

| Method | Endpoint                    | Auth     | Description                |
|--------|-----------------------------|----------|----------------------------|
| POST   | /api/auth/register          | Public   | Create account             |
| POST   | /api/auth/login             | Public   | Sign in                    |
| GET    | /api/auth/me                | Customer | Get current user           |
| GET    | /api/customer/account       | Customer | Account overview           |
| GET    | /api/customer/websites      | Customer | List websites              |
| POST   | /api/customer/tickets       | Customer | Create support ticket      |
| GET    | /api/admin/overview         | Admin    | Business metrics           |
| GET    | /api/admin/customers        | Admin    | List all customers         |
| PATCH  | /api/admin/customers/:id    | Admin    | Suspend/activate/change    |
| POST   | /api/webhooks/stripe        | Stripe   | Payment webhook            |
| POST   | /api/webhooks/flutterwave   | Flw      | Payment webhook            |
