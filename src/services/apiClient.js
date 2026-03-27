// Axios instance with auth interceptors and error handling
import axios from 'axios';
import logger from '../utils/logger';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://dev.natureland.hipster-virtual.com';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Store for the 401 callback to handle logout (set by AuthContext)
let onUnauthorized = null;

/**
 * Register callback for handling 401 responses (logout)
 */
export function registerUnauthorizedCallback(callback) {
  onUnauthorized = callback;
}

/**
 * Request interceptor — attach token from localStorage
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spa_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API', `${config.method.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    logger.error('API', 'Request error', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor — handle errors, 401 logout
 */
apiClient.interceptors.response.use(
  (response) => {
    logger.debug('API', `Response ${response.status} ${response.config.url}`, response.data);
    // For therapists and bookings endpoints, log full structure for debugging
    if (response.config.url.includes('therapists') || response.config.url.includes('bookings')) {
      console.log(`[FULL RESPONSE] ${response.config.url}:`, JSON.stringify(response.data, null, 2));
    }
    return response;
  },
  (error) => {
    const { response, config } = error;

    // Handle 401 — token expired or invalid
    if (response?.status === 401) {
      logger.warn('API', 'Unauthorized (401) — logging out', { url: config.url });
      localStorage.removeItem('spa_auth_token');
      localStorage.removeItem('spa_user');
      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    // Log all errors
    const errorData = response?.data || error.message;
    logger.error('API', `Error ${response?.status || 'Unknown'} ${config.url}`, errorData);

    return Promise.reject(error);
  }
);

export default apiClient;
