import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Failed to load dashboard</h2>
        <button 
          onClick={fetchDashboardData}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, charts, tables } = dashboardData;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {overview.totalUsers}
            </div>
            <div className="text-gray-600">Total Customers</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {overview.totalProducts}
            </div>
            <div className="text-gray-600">Active Products</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {overview.totalOrders}
            </div>
            <div className="text-gray-600">Total Orders</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              ${overview.currentMonthRevenue}
            </div>
            <div className="text-gray-600">This Month Revenue</div>
          </div>
        </div>
      </div>

      {/* Current Month Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">This Month</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Orders</span>
                <span className="font-semibold">{overview.currentMonthOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Revenue</span>
                <span className="font-semibold">${overview.currentMonthRevenue}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Order Value</span>
                <span className="font-semibold">${overview.averageOrderValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Order Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {charts.orderStatusStats.map((stat) => (
                <div key={stat.status} className="flex justify-between items-center">
                  <span className="capitalize">{stat.status}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{stat.count}</span>
                    <span className="text-sm text-gray-500">(${stat.totalValue})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Best Selling Products */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Best Selling Products</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Total Sold</th>
                  <th className="text-left py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {charts.bestSellingProducts.map((product) => (
                  <tr key={product._id} className="border-b">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{product.category}</td>
                    <td className="py-2">${product.price}</td>
                    <td className="py-2">{product.totalSold}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        product.stock > 10 ? 'bg-green-100 text-green-800' : 
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Orders and Low Stock */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Recent Orders</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {tables.recentOrders.map((order) => (
                <div key={order._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">#{order.orderNumber}</div>
                    <div className="text-sm text-gray-500">{order.userId?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${order.totalAmount}</div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Low Stock Alert</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {tables.lowStockProducts.map((product) => (
                <div key={product._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${product.price}</div>
                    <div className="text-sm text-red-600">
                      Only {product.stock} left
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 