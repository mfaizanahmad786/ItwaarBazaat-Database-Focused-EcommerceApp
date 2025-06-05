# MERN eCommerce - MongoDB Features Demo

A comprehensive MERN stack eCommerce application showcasing advanced MongoDB features including aggregation pipelines, transactions, concurrency control, and more.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- Git

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd MERN_Ecommerce
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/mern_ecommerce
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@ecommerce.com
ADMIN_PASSWORD=admin123
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### 4. Seed Database (Optional)
```bash
npm run seed
```

### 5. Run the Application

#### Option 1: Run Both Frontend & Backend (Recommended)
```bash
npm run dev
```

#### Option 2: Run Separately
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Dashboard**: http://localhost:3000/admin

## 🔐 Test Credentials

### Admin Access
- **Email**: admin@ecommerce.com
- **Password**: admin123

### Customer Access
- **Email**: john.doe@example.com
- **Password**: password123

## 🎯 Key Features

### Frontend Features
- ✅ **Home Page** - Landing page with MongoDB features showcase
- ✅ **Product Catalog** - Search, filter, pagination
- ✅ **Authentication** - Login/Register with JWT
- ✅ **Shopping Cart** - Add/remove items, quantity management
- ✅ **Order Management** - Place orders, view history
- ✅ **Admin Dashboard** - Complete admin interface
- ✅ **Responsive Design** - Mobile-friendly with Tailwind CSS

### Backend Features
- ✅ **CRUD Operations** - Complete database operations
- ✅ **Aggregation Pipelines** - Complex data analysis
- ✅ **Transactions** - ACID compliance for orders
- ✅ **Concurrency Control** - OCC & PCC for inventory
- ✅ **Indexing** - Performance optimization
- ✅ **Security** - Input validation, rate limiting
- ✅ **Sharding Ready** - Horizontal scaling preparation

## 📊 MongoDB Features Demonstrated

1. **CRUD Operations** - Complete Create, Read, Update, Delete
2. **Aggregation Pipelines** - Sales analytics, revenue tracking
3. **Indexing** - Text search, compound indexes, performance
4. **Transactions** - Multi-document ACID transactions
5. **Concurrency Control** - Optimistic & Pessimistic locking
6. **Views** - Sanitized data access
7. **Materialized Views** - Pre-computed analytics
8. **Security** - Injection prevention, validation
9. **Query Optimization** - Efficient database queries
10. **Sharding** - Horizontal scaling readiness

## 📁 Project Structure

```
MERN_Ecommerce/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   └── App.js         # Main app component
├── models/                # MongoDB models
├── routes/                # Express routes
├── middleware/            # Custom middleware
├── scripts/               # Database seeding
├── server.js              # Express server
└── package.json           # Dependencies
```

## 🔧 Available Scripts

```bash
npm start          # Start production server
npm run server     # Start development server with nodemon
npm run client     # Start React development server
npm run dev        # Start both frontend and backend
npm run seed       # Seed database with sample data
```

## 🌟 Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React.js** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Context API** - State management

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get products with filters
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get single order

### Admin
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/analytics/sales` - Sales analytics
- `GET /api/admin/system/health` - System health

## 🚨 Common Issues & Solutions

### Port Already in Use
```bash
# Kill process on port 3000 or 5000
npx kill-port 3000
npx kill-port 5000
```

### Database Connection Issues
1. Check MongoDB URI in `.env`
2. Ensure IP whitelist includes your IP
3. Verify database credentials

### Frontend Build Issues
```bash
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 