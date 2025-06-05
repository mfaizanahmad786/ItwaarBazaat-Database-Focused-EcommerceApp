const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { body } = require('express-validator');

// MongoDB Schema with Concurrency Control - Product Model
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        return !/[<>]/.test(v);
      },
      message: 'Product name contains invalid characters'
    }
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    max: [999999, 'Price is too high']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  // Optimistic Concurrency Control (OCC) for Stock Management
  version: {
    type: Number,
    default: 0
  },
  // Pessimistic Concurrency Control (PCC) - Locking Flag
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
      imageUrl: {
    type: String,
    default: 'https://dummyimage.com/300x300/e0e0e0/ffffff&text=No+Image'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Sales tracking for analytics
  totalSold: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for Performance - MongoDB Indexing Feature
productSchema.index({ name: 'text', description: 'text' }); // Full-text search
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isActive: 1, stock: 1 });

// Add pagination plugin
productSchema.plugin(mongoosePaginate);

// Pre-save middleware to increment version for OCC
productSchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    this.version += 1;
  }
  next();
});

// Static Method for Stock Update with Concurrency Control
productSchema.statics.updateStockSafe = async function(productId, quantityChange, session = null) {
  const options = session ? { session } : {};
  
  // Optimistic Concurrency Control (OCC) approach
  const product = await this.findById(productId, null, options);
  if (!product) {
    throw new Error('Product not found');
  }
  
  const currentVersion = product.version;
  const newStock = product.stock + quantityChange;
  
  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }
  
  // Update with version check - prevents concurrent modifications
  const result = await this.findOneAndUpdate(
    { 
      _id: productId, 
      version: currentVersion,
      isLocked: false 
    },
    { 
      $inc: { stock: quantityChange, version: 1 },
      $set: { updatedAt: new Date() }
    },
    { new: true, ...options }
  );
  
  if (!result) {
    throw new Error('Product stock update failed due to concurrent modification or product is locked');
  }
  
  return result;
};

// Static Method for Pessimistic Concurrency Control (PCC)
productSchema.statics.lockProduct = async function(productId, userId, session = null) {
  const options = session ? { session } : {};
  
  // Lock timeout (5 minutes)
  const lockTimeout = new Date(Date.now() - 5 * 60 * 1000);
  
  const result = await this.findOneAndUpdate(
    {
      _id: productId,
      $or: [
        { isLocked: false },
        { lockedAt: { $lt: lockTimeout } } // Auto-release old locks
      ]
    },
    {
      $set: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId
      }
    },
    { new: true, ...options }
  );
  
  if (!result) {
    throw new Error('Product is currently locked by another operation');
  }
  
  return result;
};

productSchema.statics.unlockProduct = async function(productId, userId, session = null) {
  const options = session ? { session } : {};
  
  return await this.findOneAndUpdate(
    { _id: productId, lockedBy: userId },
    {
      $set: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null
      }
    },
    { new: true, ...options }
  );
};

// Query Optimization Method with .explain() example
productSchema.statics.findByCategory = function(category, options = {}) {
  const query = this.find({ category, isActive: true }).sort({ createdAt: -1 });
  
  // For query optimization analysis in development:
  // return query.explain('executionStats');
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query;
};

// Aggregation Pipeline for Best Selling Products
productSchema.statics.getBestSelling = function(limit = 5) {
  return this.aggregate([
    { $match: { isActive: true } },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        price: 1,
        category: 1,
        totalSold: 1,
        stock: 1,
        imageUrl: 1
      }
    }
  ]);
};

// Express Validator Rules for Product Input
const productValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!]+$/)
      .withMessage('Product name contains invalid characters'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
      .isFloat({ min: 0, max: 999999 })
      .withMessage('Price must be a positive number less than 999999'),
    
    body('category')
      .isIn(['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'])
      .withMessage('Invalid category'),
    
    body('stock')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Image URL must be valid')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters'),
    
    body('price')
      .optional()
      .isFloat({ min: 0, max: 999999 })
      .withMessage('Price must be a positive number'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer')
  ]
};

const Product = mongoose.model('Product', productSchema);

module.exports = { Product, productValidation }; 