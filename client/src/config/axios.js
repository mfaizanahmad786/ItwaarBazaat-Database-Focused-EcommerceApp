import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://itwaarbazaar-ecommerceapp.onrender.com'
  : 'http://localhost:5000';

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance; 