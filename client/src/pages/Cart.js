import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cart = { items: [] }, updateQuantity, removeFromCart, cartTotal, loading } = useCart();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6H19" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
          <Link to="/products" className="btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.productId} className="card">
                <div className="card-body">
                  <div className="flex items-center space-x-4">
                    {/* Product Image */}
                    <img 
                      src={item.imageUrl || 'https://placehold.co/100x100/EEE/31343C?text=No+Image'} 
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.productName}</h3>
                      <p className="text-gray-600">${item.price} each</p>
                      {item.availableStock !== undefined && (
                        <p className="text-sm text-gray-500">
                          {item.inStock ? `${item.availableStock} in stock` : 'Out of stock'}
                        </p>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        disabled={item.availableStock && item.quantity >= item.availableStock}
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Item Total */}
                    <div className="text-right">
                      <p className="font-semibold text-lg">${item.total}</p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {/* Out of stock warning */}
                  {item.availableStock !== undefined && !item.inStock && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">
                        This item is currently out of stock and will be removed at checkout.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Order Summary</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="flex justify-between">
                <span>Items ({cart.itemCount})</span>
                <span>${cartTotal}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              
              <hr />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${cartTotal}</span>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-primary w-full"
                  disabled={cart.items.some(item => !item.inStock)}
                >
                  Proceed to Checkout
                </button>
                
                <Link 
                  to="/products" 
                  className="btn-secondary w-full text-center block"
                >
                  Continue Shopping
                </Link>
              </div>
              
              {cart.items.some(item => !item.inStock) && (
                <div className="text-sm text-red-600">
                  Remove out-of-stock items to proceed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart; 