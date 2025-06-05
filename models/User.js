const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');

// MongoDB Schema with Validation - NoSQL Injection Prevention
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    // XSS Prevention
    validate: {
      validator: function(v) {
        return !/[<>]/.test(v);
      },
      message: 'Name contains invalid characters'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  // Optimistic Concurrency Control (OCC) - Versioning
  __v: {
    type: Number,
    select: false
  }
}, {
  timestamps: true,
  // Enable versioning for concurrency control
  versionKey: '__v'
});

// Index for Performance - MongoDB Indexing Feature
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

// Pre-save Middleware for Password Hashing
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Method to Check Password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static Method for Safe User Query - Query Optimization
userSchema.statics.findByEmailSafe = function(email) {
  // Example of using .explain() for query optimization
  // In development, you can chain .explain('executionStats') to analyze query performance
  return this.findOne({ email: email.toLowerCase() })
    .select('+password'); // Include password for authentication
  
  // For query optimization analysis, uncomment the line below:
  // .explain('executionStats');
};

// Static Method for Sanitized User Data
userSchema.statics.getSanitizedUser = function(userId) {
  return this.findById(userId).select('-password -__v');
};

// Express Validator Rules for Input Sanitization - NoSQL Injection Prevention
const userValidation = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-_.]+$/)
      .withMessage('Name can contain letters, numbers, spaces, hyphens, dots, and underscores'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom(async (email) => {
        const existingUser = await mongoose.model('User').findOne({ email });
        if (existingUser) {
          throw new Error('Email already registered');
        }
      }),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  
  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

const User = mongoose.model('User', userSchema);

module.exports = { User, userValidation }; 