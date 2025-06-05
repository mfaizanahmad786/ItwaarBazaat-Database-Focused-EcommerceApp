const mongoose = require('mongoose');
const { body } = require('express-validator');

// Order Item Schema for embedded documents
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  total: {
    type: Number,
    required: true
  }
});

// MongoDB Schema for Orders with Sharding Preparation
const orderSchema = new mongoose.Schema({
  // Shard Key for Horizontal Scaling - orders can be sharded by userId
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true // Important for sharding
  },
  // Alternative shard key - could shard by region instead
  region: {
    type: String,
    enum: ['North', 'South', 'East', 'West', 'Central'],
    default: 'Central',
    index: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' }
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // For transaction logging and audit trail
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Compound Indexes for Query Optimization
orderSchema.index({ userId: 1, createdAt: -1 }); // User's order history
orderSchema.index({ status: 1, createdAt: -1 }); // Admin order management
orderSchema.index({ createdAt: -1 }); // General sorting
orderSchema.index({ orderNumber: 1 }, { unique: true }); // Order lookup

// Sharding Strategy Documentation
/*
MongoDB Sharding Configuration for Orders Collection:

1. Shard by userId (User-based sharding):
   sh.shardCollection("mern_ecommerce.orders", { "userId": 1 })
   
   Benefits:
   - All orders for a user are on the same shard
   - Efficient user order history queries
   - Good for user-centric operations
   
   Drawbacks:
   - Potential hotspots if some users order much more
   - Admin queries across all orders need to hit all shards

2. Shard by region (Geographic sharding):
   sh.shardCollection("mern_ecommerce.orders", { "region": 1, "_id": 1 })
   
   Benefits:
   - Geographic distribution of load
   - Regional analytics are efficient
   - Easier compliance with data residency requirements
   
3. Compound shard key:
   sh.shardCollection("mern_ecommerce.orders", { "userId": 1, "createdAt": 1 })
   
   Benefits:
   - Better distribution
   - Time-based queries are efficient
   - Avoids some hotspot issues

Example implementation:
// Enable sharding on database
use admin
db.runCommand({ enableSharding: "mern_ecommerce" })

// Shard the orders collection
sh.shardCollection("mern_ecommerce.orders", { "userId": 1 })

// Create zones for geographic distribution (optional)
sh.addShardTag("shard0000", "US_EAST")
sh.addShardTag("shard0001", "US_WEST")
sh.addTagRange("mern_ecommerce.orders", 
  { "region": "East" }, { "region": "East" }, "US_EAST")
*/

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Static method for transaction-safe order creation
orderSchema.statics.createOrderWithTransaction = async function(orderData, session) {
  const order = new this(orderData);
  return await order.save({ session });
};

// Aggregation Pipeline for Monthly Revenue - MongoDB Aggregation Feature
orderSchema.statics.getMonthlyRevenue = function(year = new Date().getFullYear()) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        },
        status: { $ne: 'cancelled' },
        paymentStatus: 'completed'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        monthName: {
          $arrayElemAt: [
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            { $subtract: ['$_id.month', 1] }
          ]
        },
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
        averageOrderValue: { $round: ['$averageOrderValue', 2] }
      }
    }
  ]);
};

// Aggregation for Order Status Distribution
orderSchema.statics.getOrderStatusStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalValue: { $round: ['$totalValue', 2] },
        _id: 0
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Query optimization method
orderSchema.statics.findUserOrders = function(userId, options = {}) {
  const query = this.find({ userId })
    .populate('items.productId', 'name imageUrl')
    .sort({ createdAt: -1 });

  // For query optimization analysis:
  // return query.explain('executionStats');

  if (options.limit) {
    query.limit(options.limit);
  }

  return query;
};

// Express Validator Rules for Order Input
const orderValidation = {
  create: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must contain at least one item'),
    
    body('items.*.productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
    
    body('items.*.quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100'),
    
    body('shippingAddress.street')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Street address must be between 5 and 100 characters'),
    
    body('shippingAddress.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    
    body('shippingAddress.zipCode')
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage('Invalid ZIP code format'),
    
    body('paymentMethod')
      .isIn(['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'])
      .withMessage('Invalid payment method')
  ],
  
  updateStatus: [
    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status')
  ]
};

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order, orderValidation }; 