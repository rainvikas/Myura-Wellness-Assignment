# Myura Wellness Assignment

A full-stack implementation of the Myura Wellness backend practical assignment using Node.js, Express, PostgreSQL, and a React-based frontend served by the backend.

## What Is Included

- Product management API
  - `GET /api/products`
  - `POST /api/products`
  - `PUT /api/products/:id/stock`
- Order management API
  - `POST /api/orders`
  - Uses a database transaction and row locking to prevent overselling
- API security and reliability
  - Parameterized PostgreSQL queries to prevent SQL injection
  - Input validation on all write endpoints
  - Centralized error handling with proper HTTP status codes
  - `helmet` security headers
  - API rate limiting
  - Request logging and backend error logging
- Basic UI
  - View products
  - Add products
  - Place orders
- Deployment support
  - `render.yaml` blueprint for Render
  - Database bootstrap script via `npm run db:init`

## Tech Stack

- Backend: Node.js, Express
- Database: PostgreSQL
- Frontend: React UI served from the Express app
- Deployment target: Render blueprint included

## Project Structure

```text
.
|-- docs/                # API documentation
|-- public/              # React-based UI served by Express
|-- scripts/             # Database initialization
|-- src/
|   |-- config/          # PostgreSQL connection
|   |-- controllers/     # Route handlers
|   |-- db/              # SQL schema
|   |-- middleware/      # Validation, async handling, errors
|   |-- routes/          # API routes
|   |-- utils/           # Logger and AppError
|   |-- validators/      # Request validation
|-- tests/               # Automated API tests with pg-mem + supertest
|-- package.json
|-- render.yaml
|-- server.js
```

## Database Schema

The schema is defined in [src/db/schema.sql](src/db/schema.sql).

Tables:

- `products`
  - `id`
  - `product_name`
  - `price`
  - `category`
  - `stock`
  - `created_at`
  - `updated_at`
- `orders`
  - `id`
  - `customer_name`
  - `customer_email`
  - `customer_phone`
  - `shipping_address`
  - `total_amount`
  - `created_at`
- `order_items`
  - `id`
  - `order_id`
  - `product_id`
  - `quantity`
  - `unit_price`
  - `created_at`

The schema also creates indexes and a trigger to keep `products.updated_at` current.

## API Documentation

Detailed API documentation is available in [docs/api.md](docs/api.md).

Quick summary:

- `GET /api/health` returns service health status.
- `GET /api/products` returns all products.
- `POST /api/products` creates a product.
- `PUT /api/products/:id/stock` sets the absolute stock value for a product.
- `POST /api/orders` creates an order and reduces stock in the same transaction.

## Frontend UI

Task 4 is implemented.

- Live frontend URL: `https://myura-wellness-api.onrender.com`
- Frontend stack: React UI served by the Express backend
- UI features:
  - view all products
  - add a new product
  - place an order
- Frontend source files:
  - `public/index.html`
  - `public/app.jsx`
  - `public/styles.css`

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+

### 1. Configure environment variables

Create a `.env` file in the project root and add the following values.

Recommended `.env` for local setup:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/myura_wellness
CORS_ORIGIN=http://localhost:5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

Field reference:

- `PORT`: backend server port
- `NODE_ENV`: runtime mode, use `development` locally
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGIN`: allowed frontend origin
- `RATE_LIMIT_WINDOW_MS`: rate-limit window in milliseconds
- `RATE_LIMIT_MAX`: maximum API requests allowed per window

### 2. Install dependencies

```bash
npm install
```

### 3. Initialize the database schema

```bash
npm run db:init
```

### 4. Start the application

```bash
npm start
```

### 5. Run the API test suite

```bash
npm test
```

The automated tests use `pg-mem`, so they verify the API flow without needing a separate local PostgreSQL service.

Local URLs:

- App: `http://localhost:5000`
- API health check: `http://localhost:5000/api/health`

## Deployment

This repository includes [render.yaml](render.yaml) so it can be deployed as a Render blueprint with a PostgreSQL database and a Node.js web service.

### Render deployment steps

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and connect the repository.
3. Render will provision:
   - a PostgreSQL database named `myura-wellness-db`
   - a web service for the app
4. Set `CORS_ORIGIN` to the final public app URL in the Render dashboard.
5. Deploy the blueprint.
6. Confirm the app is reachable at `/` and the API is reachable at `/api/health`.

### Manual deployment settings

- Build command: `npm install`
- Start command: `npm run db:init && npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `DATABASE_URL=<managed postgres connection string>`
  - `CORS_ORIGIN=<frontend url>`
  - `RATE_LIMIT_WINDOW_MS=900000`
  - `RATE_LIMIT_MAX=100`

### Live URLs

The project is deployed and the frontend and backend are live at the URLs below.

- GitHub repository link: `https://github.com/rainvikas/Myura-Wellness-Assignment`
- Live project URL: `https://myura-wellness-api.onrender.com`
- Backend API URL: `https://myura-wellness-api.onrender.com/api`

### Database setup details

- Database engine: PostgreSQL
- Database hosting: Render Free PostgreSQL
- Schema bootstrap command: `npm run db:init`
- Schema file: [src/db/schema.sql](src/db/schema.sql)
- Order placement uses SQL transactions and `FOR UPDATE` row locks to avoid stock race conditions

## Security Notes

- SQL injection protection is handled through parameterized `pg` queries.
- Input validation is implemented before database writes.
- Invalid input returns `400`.
- Missing resources return `404`.
- Insufficient stock returns `409`.
- Unexpected failures return `500`.

## Bonus Features Implemented

- API rate limiting via `express-rate-limit`
- Request logging via `morgan`
- Backend error logging to console and `logs/error.log`
- Automated API tests using `pg-mem` and `supertest`

JWT authentication and image upload are not included in this version.
