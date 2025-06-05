import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/orders/my-orders?page=${pagination.currentPage}&limit=10`);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await axios.patch(`/api/orders/${orderId}/cancel`);
      alert('Order cancelled successfully');
      fetchOrders(); // Refresh orders
    } catch (error) {
      alert('Failed to cancel order: ' + (error.response?.data?.message || 'Unknown error'));
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

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-6">When you place your first order, it will appear here</p>
          <Link to="/products" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h1>
      
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order._id} className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <p className="text-lg font-bold mt-2">${order.totalAmount}</p>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {/* Order Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <img 
                      src={item.productId?.imageUrl || 'https://via.placeholder.com/60x60?text=No+Image'} 
                      alt={item.productName}
                      className="w-15 h-15 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      <p className="text-sm text-gray-500">
                        ${item.price} × {item.quantity} = ${item.total}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Shipping Address */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                  {order.shippingAddress.country}
                </p>
              </div>
              
              {/* Payment Method */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Payment Method</h4>
                <p className="text-sm text-gray-600 capitalize">
                  {order.paymentMethod.replace('_', ' ')}
                </p>
              </div>
              
              {/* Actions */}
              <div className="border-t pt-4 mt-4 flex space-x-4">
                <Link 
                  to={`/orders/${order._id}`}
                  className="btn-secondary"
                >
                  View Details
                </Link>
                
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleCancelOrder(order._id)}
                    className="btn-danger"
                  >
                    Cancel Order
                  </button>
                )}
                
                {order.status === 'delivered' && (
                  <button className="btn-secondary" disabled>
                    Reorder
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-8">
          <button
            onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
            disabled={pagination.currentPage === 1}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            Previous
          </button>

          {[...Array(pagination.totalPages)].map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                onClick={() => setPagination({ ...pagination, currentPage: page })}
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
            onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders; 