import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
// Remove hardcoded baseURL since we're using proxy
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

// Action types
const AuthActionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER: 'LOAD_USER',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_START:
    case AuthActionTypes.REGISTER_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case AuthActionTypes.LOGIN_SUCCESS:
    case AuthActionTypes.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    
    case AuthActionTypes.LOGIN_FAILURE:
    case AuthActionTypes.REGISTER_FAILURE:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
    
    case AuthActionTypes.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null
      };
    
    case AuthActionTypes.LOAD_USER:
      return {
        ...state,
        user: action.payload,
        loading: false
      };
    
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set auth header
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      console.log('Auth token set:', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      console.log('Auth token removed');
    }
  };

  // Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          dispatch({ type: AuthActionTypes.LOGOUT });
          return;
        }

        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const response = await axios.get('/api/auth/me');
        
        if (response.data && response.data.user) {
          dispatch({
            type: AuthActionTypes.LOAD_USER,
            payload: response.data.user
          });
        } else {
          throw new Error('Invalid user data received');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
        dispatch({ type: AuthActionTypes.LOGOUT });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AuthActionTypes.LOGIN_START });
    
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      if (response.data && response.data.token) {
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        localStorage.setItem('token', response.data.token);
        
        dispatch({
          type: AuthActionTypes.LOGIN_SUCCESS,
          payload: response.data
        });
        return { success: true };
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    dispatch({ type: AuthActionTypes.REGISTER_START });
    
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password
      });
      
      if (response.data && response.data.token) {
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        localStorage.setItem('token', response.data.token);
      }
      
      dispatch({
        type: AuthActionTypes.REGISTER_SUCCESS,
        payload: response.data
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: AuthActionTypes.REGISTER_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    setAuthToken(null);
    dispatch({ type: AuthActionTypes.LOGOUT });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!state.user && !!state.token;
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError,
    isAdmin,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 