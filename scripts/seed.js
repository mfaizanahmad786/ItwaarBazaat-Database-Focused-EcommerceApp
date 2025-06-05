const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User } = require('../models/User');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const MonthlyStats = require('../models/MonthlyStats');

// Sample data
const sampleProducts = [
  {
    name: 'iPhone 14 Pro',
    description: 'Latest Apple iPhone with A16 Bionic chip, Pro camera system, and 6.1-inch Super Retina XDR display.',
    price: 999.99,
    category: 'Electronics',
    stock: 25,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=iPhone+14+Pro',
    totalSold: 15
  },
  {
    name: 'Samsung Galaxy S23',
    description: 'Premium Android smartphone with advanced camera features and long-lasting battery.',
    price: 899.99,
    category: 'Electronics',
    stock: 30,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Galaxy+S23',
    totalSold: 12
  },
  {
    name: 'MacBook Air M2',
    description: 'Ultra-thin laptop powered by Apple M2 chip with exceptional performance and battery life.',
    price: 1199.99,
    category: 'Electronics',
    stock: 15,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=MacBook+Air',
    totalSold: 8
  },
  {
    name: 'Nike Air Max 270',
    description: 'Comfortable running shoes with Max Air cushioning and modern design.',
    price: 129.99,
    category: 'Clothing',
    stock: 50,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Nike+Air+Max',
    totalSold: 25
  },
  {
    name: 'Levi\'s 501 Jeans',
    description: 'Classic straight-fit jeans made from premium denim with authentic styling.',
    price: 89.99,
    category: 'Clothing',
    stock: 40,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Levis+501',
    totalSold: 20
  },
  {
    name: 'The Great Gatsby',
    description: 'Classic American novel by F. Scott Fitzgerald, exploring themes of wealth and decadence.',
    price: 12.99,
    category: 'Books',
    stock: 100,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Great+Gatsby',
    totalSold: 35
  },
  {
    name: 'Clean Code',
    description: 'Essential programming book by Robert C. Martin on writing maintainable code.',
    price: 39.99,
    category: 'Books',
    stock: 75,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Clean+Code',
    totalSold: 18
  },
  {
    name: 'Coffee Maker Pro',
    description: 'Premium coffee maker with programmable settings and thermal carafe.',
    price: 159.99,
    category: 'Home',
    stock: 20,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Coffee+Maker',
    totalSold: 22
  },
  {
    name: 'Yoga Mat Premium',
    description: 'High-quality yoga mat with non-slip surface and extra cushioning.',
    price: 49.99,
    category: 'Sports',
    stock: 60,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Yoga+Mat',
    totalSold: 30
  },
  {
    name: 'Wireless Headphones',
    description: 'Bluetooth headphones with noise cancellation and 30-hour battery life.',
    price: 199.99,
    category: 'Electronics',
    stock: 35,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Headphones',
    totalSold: 28
  },
  {
    name: 'Smart Watch',
    description: 'Fitness tracker with heart rate monitoring and smartphone integration.',
    price: 249.99,
    category: 'Electronics',
    stock: 25,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Smart+Watch',
    totalSold: 16
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable and sustainable t-shirt made from 100% organic cotton.',
    price: 24.99,
    category: 'Clothing',
    stock: 80,
    imageUrl: 'https://placehold.co/300x300/EEE/31343C?text=Cotton+Tshirt',
    totalSold: 45
  }
];

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@ecommerce.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'customer'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'customer'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    password: 'password123',
    role: 'customer'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    password: 'password123',
    role: 'customer'
  },
  {
    name: 'David Brown',
    email: 'david.brown@example.com',
    password: 'password123',
    role: 'customer'
  }
];

// Function to create sample orders
const createSampleOrders = async (users, products) => {
  const orders = [];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];
  const paymentMethods = ['credit_card', 'debit_card', 'paypal'];
  
  // Create orders for the past 6 months
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    // Random date within last 6 months
    const orderDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000);
    
    // Random customer (skip admin user)
    const customer = users[Math.floor(Math.random() * (users.length - 1)) + 1];
    
    // Random number of items (1-4)
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const orderItems = [];
    let totalAmount = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = product.price * quantity;
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity,
        price: product.price,
        total: itemTotal
      });
      
      totalAmount += itemTotal;
    }
    
    const order = {
      userId: customer._id,
      region: regions[Math.floor(Math.random() * regions.length)],
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: Math.random() > 0.1 ? 'completed' : 'pending',
      shippingAddress: {
        street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
        city: 'Sample City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      },
      createdAt: orderDate,
      updatedAt: orderDate
    };
    
    orders.push(order);
  }
  
  return orders;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      MonthlyStats.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create products
    console.log('📦 Creating products...');
    const createdProducts = [];
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
    }
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create orders
    console.log('🛒 Creating orders...');
    const orderData = await createSampleOrders(createdUsers, createdProducts);
    const createdOrders = await Order.insertMany(orderData);
    console.log(`✅ Created ${createdOrders.length} orders`);

    // Generate materialized view data
    console.log('📊 Generating materialized view data...');
    const currentYear = new Date().getFullYear();
    await MonthlyStats.refreshYearlyStats(currentYear);
    
    // Also generate data for previous year if we have orders
    const previousYear = currentYear - 1;
    await MonthlyStats.refreshYearlyStats(previousYear);
    console.log('✅ Materialized views generated');

    // Display summary
    console.log('\n📈 Seeding Summary:');
    console.log(`Users: ${createdUsers.length}`);
    console.log(`  - Admins: ${createdUsers.filter(u => u.role === 'admin').length}`);
    console.log(`  - Customers: ${createdUsers.filter(u => u.role === 'customer').length}`);
    console.log(`Products: ${createdProducts.length}`);
    console.log(`  - Electronics: ${createdProducts.filter(p => p.category === 'Electronics').length}`);
    console.log(`  - Clothing: ${createdProducts.filter(p => p.category === 'Clothing').length}`);
    console.log(`  - Books: ${createdProducts.filter(p => p.category === 'Books').length}`);
    console.log(`  - Home: ${createdProducts.filter(p => p.category === 'Home').length}`);
    console.log(`  - Sports: ${createdProducts.filter(p => p.category === 'Sports').length}`);
    console.log(`Orders: ${createdOrders.length}`);
    
    const totalRevenue = createdOrders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    console.log(`Total Revenue: $${Math.round(totalRevenue * 100) / 100}`);

    console.log('\n🔐 Test Credentials:');
    console.log('Admin: admin@ecommerce.com / admin123');
    console.log('Customer: john.doe@example.com / password123');

    console.log('\n🧪 MongoDB Features Demonstrated:');
    console.log('✅ CRUD Operations');
    console.log('✅ Aggregation Pipelines');
    console.log('✅ Indexing');
    console.log('✅ Query Optimization');
    console.log('✅ Transactions (ready for order creation)');
    console.log('✅ Concurrency Control (OCC/PCC)');
    console.log('✅ Sharding (schema prepared)');
    console.log('✅ Views (will be created on server start)');
    console.log('✅ Materialized Views');
    console.log('✅ DB Security (validation & sanitization)');
    console.log('✅ Injection Prevention');

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 