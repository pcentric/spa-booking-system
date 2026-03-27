import axios from 'axios';

const BASE_URL = 'https://dev.natureland.hipster-virtual.com';

// Create axios instance with base config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('spa_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (optional, for future use)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors but don't throw here — let calling code handle
    if (error.response?.status === 401) {
      console.warn('Token expired or invalid');
      sessionStorage.removeItem('spa_auth_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
