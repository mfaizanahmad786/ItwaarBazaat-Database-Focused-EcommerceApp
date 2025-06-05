import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

  const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await axios.get(`/api/orders?${queryParams}`);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: newStatus
      });
      alert('Order status updated successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="form-label">Search Orders</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by order number..."
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="form-input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', search: '', startDate: '', endDate: '', page: 1 })}
                className="btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Order #</th>
                  <th className="text-left py-3 px-2">Customer</th>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Amount</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Items</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="font-medium">#{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {order.transactionId}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium">{order.userId?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{order.userId?.email || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium">${order.totalAmount}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {order.paymentMethod.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        className={`text-sm px-2 py-1 rounded border-0 ${getStatusColor(order.status)}`}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => {
                          // Show order details
                          const details = `
Order #${order.orderNumber}
Customer: ${order.userId?.name} (${order.userId?.email})
Date: ${formatDate(order.createdAt)}
Total: $${order.totalAmount}
Status: ${order.status}
Payment: ${order.paymentMethod.replace('_', ' ')}

Items:
${order.items.map(item => `- ${item.productName} x${item.quantity} = $${item.total}`).join('\n')}

Shipping Address:
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}
                          `.trim();
                          alert(details);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setFilters({ ...filters, page: pagination.currentPage - 1 })}
                disabled={pagination.currentPage === 1}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Previous
              </button>

              {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                const page = pagination.currentPage - 2 + index;
                if (page < 1 || page > pagination.totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => setFilters({ ...filters, page })}
                    className={`px-3 py-2 rounded-lg ${
                      page === pagination.currentPage
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setFilters({ ...filters, page: pagination.currentPage + 1 })}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusOptions.map(status => {
          const statusCount = orders.filter(order => order.status === status).length;
          const statusTotal = orders
            .filter(order => order.status === status)
            .reduce((sum, order) => sum + order.totalAmount, 0);
          
          return (
            <div key={status} className="card">
              <div className="card-body text-center">
                <div className={`text-2xl font-bold mb-2 ${
                  status === 'delivered' ? 'text-green-600' :
                  status === 'pending' ? 'text-yellow-600' :
                  status === 'processing' ? 'text-blue-600' :
                  status === 'shipped' ? 'text-purple-600' :
                  'text-red-600'
                }`}>
                  {statusCount}
                </div>
                <div className="text-gray-600 capitalize">{status} Orders</div>
                <div className="text-sm text-gray-500 mt-1">
                  ${statusTotal.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminOrders; 