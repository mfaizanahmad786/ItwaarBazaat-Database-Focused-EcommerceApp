const mongoose = require('mongoose');

// Materialized View for Monthly Statistics - MongoDB Materialized Views Feature
// This collection stores pre-computed monthly statistics for better performance
const monthlyStatsSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  monthName: {
    type: String,
    required: true
  },
  // Revenue Statistics
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  averageOrderValue: {
    type: Number,
    default: 0
  },
  // Product Statistics
  totalProductsSold: {
    type: Number,
    default: 0
  },
  topSellingProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    quantitySold: Number,
    revenue: Number
  }],
  // User Statistics
  newCustomers: {
    type: Number,
    default: 0
  },
  returningCustomers: {
    type: Number,
    default: 0
  },
  // Order Status Distribution
  ordersByStatus: {
    pending: { type: Number, default: 0 },
    processing: { type: Number, default: 0 },
    shipped: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 }
  },
  // Category Performance
  categoryStats: [{
    category: String,
    revenue: Number,
    orderCount: Number,
    productsSold: Number
  }],
  // Computed timestamp for cache invalidation
  computedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound Index for efficient querying
monthlyStatsSchema.index({ year: 1, month: 1 }, { unique: true });
monthlyStatsSchema.index({ computedAt: -1 });

// Static method to refresh materialized view data
monthlyStatsSchema.statics.refreshMonthlyStats = async function(year, month) {
  const { Order } = require('./Order');
  const { Product } = require('./Product');
  const { User } = require('./User');
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  try {
    // Aggregate order data for the month
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get order status distribution
    const statusStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          quantitySold: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Get category performance
    const categoryStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: '$items.total' },
          orderCount: { $sum: 1 },
          productsSold: { $sum: '$items.quantity' }
        }
      },
      {
        $project: {
          category: '$_id',
          revenue: 1,
          orderCount: 1,
          productsSold: 1,
          _id: 0
        }
      }
    ]);

    // Get new vs returning customers
    const customerStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          role: 'customer'
        }
      },
      {
        $count: 'newCustomers'
      }
    ]);

    // Process the aggregated data
    const orderData = orderStats[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
    
    const ordersByStatus = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    
    statusStats.forEach(stat => {
      ordersByStatus[stat._id] = stat.count;
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Upsert the monthly stats record
    const statsData = {
      year,
      month,
      monthName: monthNames[month - 1],
      totalRevenue: Math.round(orderData.totalRevenue * 100) / 100,
      totalOrders: orderData.totalOrders,
      averageOrderValue: Math.round(orderData.averageOrderValue * 100) / 100,
      totalProductsSold: topProducts.reduce((sum, p) => sum + p.quantitySold, 0),
      topSellingProducts: topProducts,
      newCustomers: customerStats[0]?.newCustomers || 0,
      returningCustomers: 0, // Would require more complex logic to track
      ordersByStatus,
      categoryStats,
      computedAt: new Date()
    };

    const result = await this.findOneAndUpdate(
      { year, month },
      statsData,
      { upsert: true, new: true }
    );

    console.log(`Monthly stats refreshed for ${monthNames[month - 1]} ${year}`);
    return result;

  } catch (error) {
    console.error('Error refreshing monthly stats:', error);
    throw error;
  }
};

// Static method to refresh all monthly stats for a year
monthlyStatsSchema.statics.refreshYearlyStats = async function(year = new Date().getFullYear()) {
  const results = [];
  
  for (let month = 1; month <= 12; month++) {
    try {
      const result = await this.refreshMonthlyStats(year, month);
      results.push(result);
    } catch (error) {
      console.error(`Failed to refresh stats for ${month}/${year}:`, error);
    }
  }
  
  return results;
};

// Static method to get performance trends
monthlyStatsSchema.statics.getYearlyTrends = function(year = new Date().getFullYear()) {
  return this.find({ year })
    .sort({ month: 1 })
    .select('month monthName totalRevenue totalOrders averageOrderValue newCustomers');
};

const MonthlyStats = mongoose.model('MonthlyStats', monthlyStatsSchema);

module.exports = MonthlyStats; 