import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from '../config/axios';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    paymentMethod: 'credit_card'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        shippingAddress: {
          ...formData.shippingAddress,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isAuthenticated()) {
      setError('Please login to place an order');
      setLoading(false);
      return;
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Set up request config with auth header
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const orderData = {
        shippingAddress: formData.shippingAddress,
        paymentMethod: formData.paymentMethod,
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      };

      console.log('Submitting order:', orderData); // Debug log
      const response = await axios.post('/api/orders', orderData, config);
      
      if (response.data && response.data.order) {
        // Clear cart and redirect to order confirmation
        await clearCart();
        alert(`Order ${response.data.order.orderNumber} placed successfully!`);
        navigate('/orders');
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Order placement error:', err);
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No items in cart</h2>
        <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
        <button 
          onClick={() => navigate('/products')}
          className="btn-primary"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Checkout Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Address */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Shipping Address</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.shippingAddress.street}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.shippingAddress.city}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.shippingAddress.state}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">ZIP Code</label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.shippingAddress.zipCode}
                      onChange={handleInputChange}
                      className="form-input"
                      pattern="^\d{5}(-\d{4})?$"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <select
                      name="address.country"
                      value={formData.shippingAddress.country}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option value="USA">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Mexico">Mexico</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Payment Method</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {[
                    { value: 'credit_card', label: 'Credit Card' },
                    { value: 'debit_card', label: 'Debit Card' },
                    { value: 'paypal', label: 'PayPal' },
                    { value: 'cash_on_delivery', label: 'Cash on Delivery' }
                  ].map((method) => (
                    <label key={method.value} className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={formData.paymentMethod === method.value}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Placing Order...' : `Place Order - $${cartTotal}`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Order Summary</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Items */}
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={item.imageUrl || 'https://placehold.co/50x50/EEE/31343C?text=No+Image'} 
                        alt={item.productName}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">${item.total}</span>
                  </div>
                ))}
                
                <hr />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${cartTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                </div>
                
                <hr />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${cartTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 