const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet());

// Trust proxy - Add this before rate limiter
app.set('trust proxy', 1);

// Rate Limiting - MongoDB Security Feature
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN || 'https://itwaar-bazaar-ecommerce-app.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with Security Best Practices
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create Indexes for Query Optimization
    await createIndexes();
    
    // Create MongoDB Views
    await createViews();
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Create Indexes for Performance - MongoDB Indexing Feature
const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Product indexes
    await db.collection('products').createIndex({ name: 'text', description: 'text' });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ price: 1 });
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Order indexes
    await db.collection('orders').createIndex({ userId: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.log('Index creation info:', error.message);
  }
};

// Create MongoDB Views - Views Feature
const createViews = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Sanitized User View (removes password field)
    try {
      await db.createCollection('usersSanitized', {
        viewOn: 'users',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              role: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ]
      });
      console.log('Sanitized users view created');
    } catch (error) {
      console.log('Users view already exists or creation failed');
    }
    
  } catch (error) {
    console.log('View creation info:', error.message);
  }
};

// Import Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const { router: cartRoutes } = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Route Middleware
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // MongoDB Injection Prevention
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: 'Validation Error', errors });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
});

module.exports = app; 