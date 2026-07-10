# LetShop - Full-Stack E-Commerce Marketplace

A full-stack e-commerce marketplace built with React, Node.js, Express, PostgreSQL, and AWS S3.

## Tech Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS
- React Router v6
- Axios

**Backend:**
- Node.js with Express
- PostgreSQL (via Prisma ORM)
- JWT Authentication
- AWS S3 for image storage
- bcrypt for password hashing

## Project Structure

```
letshop/
├── backend/
│   ├── src/
│   │   ├── config/        # AWS S3 configuration
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/     # Auth, error, upload middleware
│   │   ├── models/        # Prisma schema
│   │   ├── routes/        # Express routes
│   │   ├── uploads/       # Local upload folder (fallback)
│   │   └── server.js      # Entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Auth & Cart context
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── App.jsx        # Main app with routing
│   ├── .env
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js v18+
- npm or yarn

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@letshop.com
ADMIN_PASSWORD=your_admin_password
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-2
AWS_BUCKET_NAME=your_bucket_name
```

**Frontend (`frontend/.env`):**

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Setup Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:3000`.

### 5. Access Admin Panel

1. Navigate to `http://localhost:3000/admin/login`
2. Login with the admin credentials set in `backend/.env`
3. Default: `admin@letshop.com` / `Admin123456`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/me` - Get current user (protected)

### Products
- `GET /api/products` - Get all products (with search, filter, pagination)
- `GET /api/products/:id` - Get single product
- `GET /api/products/categories` - Get all categories
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart
- `GET /api/cart` - Get user cart (protected)
- `POST /api/cart` - Add to cart (protected)
- `PUT /api/cart/:itemId` - Update cart item (protected)
- `DELETE /api/cart/:itemId` - Remove cart item (protected)

## Features

- User registration and authentication
- Admin panel with product management
- Product search, filtering, and pagination
- Shopping cart functionality
- Responsive mobile-friendly design
- AWS S3 image upload
- JWT-based authorization
- Protected routes
