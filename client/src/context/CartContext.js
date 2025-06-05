import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from '../config/axios';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  items: [],
  itemCount: 0,
  cartTotal: 0,
  loading: false,
  error: null
};

// Action types
const CartActionTypes = {
  LOAD_CART_START: 'LOAD_CART_START',
  LOAD_CART_SUCCESS: 'LOAD_CART_SUCCESS',
  LOAD_CART_FAILURE: 'LOAD_CART_FAILURE',
  ADD_TO_CART_START: 'ADD_TO_CART_START',
  ADD_TO_CART_SUCCESS: 'ADD_TO_CART_SUCCESS',
  ADD_TO_CART_FAILURE: 'ADD_TO_CART_FAILURE',
  UPDATE_CART_START: 'UPDATE_CART_START',
  UPDATE_CART_SUCCESS: 'UPDATE_CART_SUCCESS',
  UPDATE_CART_FAILURE: 'UPDATE_CART_FAILURE',
  REMOVE_FROM_CART_SUCCESS: 'REMOVE_FROM_CART_SUCCESS',
  CLEAR_CART: 'CLEAR_CART',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CartActionTypes.LOAD_CART_START:
    case CartActionTypes.ADD_TO_CART_START:
    case CartActionTypes.UPDATE_CART_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case CartActionTypes.LOAD_CART_SUCCESS:
      return {
        ...state,
        items: action.payload.items,
        itemCount: action.payload.itemCount,
        cartTotal: action.payload.cartTotal,
        loading: false,
        error: null
      };
    
    case CartActionTypes.ADD_TO_CART_SUCCESS:
      return {
        ...state,
        itemCount: action.payload.cartSummary.itemCount,
        cartTotal: action.payload.cartSummary.cartTotal,
        loading: false,
        error: null
      };
    
    case CartActionTypes.UPDATE_CART_SUCCESS:
    case CartActionTypes.REMOVE_FROM_CART_SUCCESS:
      return {
        ...state,
        items: action.payload.cart.items,
        itemCount: action.payload.cart.itemCount,
        cartTotal: action.payload.cart.cartTotal,
        loading: false,
        error: null
      };
    
    case CartActionTypes.LOAD_CART_FAILURE:
    case CartActionTypes.ADD_TO_CART_FAILURE:
    case CartActionTypes.UPDATE_CART_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    case CartActionTypes.CLEAR_CART:
      return {
        ...initialState
      };
    
    case CartActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const CartContext = createContext();

// Cart provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    ...initialState,
    cart: { items: [], itemCount: 0, cartTotal: 0 }
  });
  const { isAuthenticated } = useAuth();

  // Load cart when user authenticates
  useEffect(() => {
    const initCart = async () => {
      if (isAuthenticated()) {
        await loadCart();
      } else {
        dispatch({ type: CartActionTypes.CLEAR_CART });
      }
    };

    initCart();
  }, [isAuthenticated]);

  // Load cart function
  const loadCart = async () => {
    if (!isAuthenticated()) return;

    dispatch({ type: CartActionTypes.LOAD_CART_START });
    
    try {
      const response = await axios.get('/api/cart');
      dispatch({
        type: CartActionTypes.LOAD_CART_SUCCESS,
        payload: response.data.cart
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load cart';
      dispatch({
        type: CartActionTypes.LOAD_CART_FAILURE,
        payload: errorMessage
      });
    }
  };

  // Add to cart function
  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated()) {
      return { success: false, error: 'Please login to add items to cart' };
    }

    dispatch({ type: CartActionTypes.ADD_TO_CART_START });
    
    try {
      const response = await axios.post('/api/cart/add', {
        productId,
        quantity
      });
      
      dispatch({
        type: CartActionTypes.ADD_TO_CART_SUCCESS,
        payload: response.data
      });
      
      // Reload cart to get updated items
      await loadCart();
      
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add item to cart';
      dispatch({
        type: CartActionTypes.ADD_TO_CART_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  };

  // Update cart item quantity
  const updateCartItem = async (productId, quantity) => {
    if (!isAuthenticated()) return;

    dispatch({ type: CartActionTypes.UPDATE_CART_START });
    
    try {
      const response = await axios.put(`/api/cart/item/${productId}`, {
        quantity
      });
      
      dispatch({
        type: CartActionTypes.UPDATE_CART_SUCCESS,
        payload: response.data
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update cart';
      dispatch({
        type: CartActionTypes.UPDATE_CART_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    if (!isAuthenticated()) return;

    try {
      const response = await axios.delete(`/api/cart/item/${productId}`);
      
      dispatch({
        type: CartActionTypes.REMOVE_FROM_CART_SUCCESS,
        payload: response.data
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to remove item';
      return { success: false, error: errorMessage };
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (!isAuthenticated()) return;

    try {
      await axios.delete('/api/cart');
      dispatch({ type: CartActionTypes.CLEAR_CART });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to clear cart';
      return { success: false, error: errorMessage };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: CartActionTypes.CLEAR_ERROR });
  };

  // Get cart summary (for header)
  const getCartSummary = async () => {
    if (!isAuthenticated()) return { itemCount: 0, cartTotal: 0 };

    try {
      const response = await axios.get('/api/cart/summary');
      return response.data;
    } catch (error) {
      console.error('Failed to get cart summary:', error);
      return { itemCount: 0, cartTotal: 0 };
    }
  };

  const value = {
    cart: {
      items: state.items || [],
      itemCount: state.itemCount || 0,
      cartTotal: state.cartTotal || 0
    },
    loading: state.loading,
    error: state.error,
    addToCart,
    updateQuantity: updateCartItem,
    removeFromCart,
    clearCart,
    clearError
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 