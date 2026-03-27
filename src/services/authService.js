import apiClient from './apiClient.js';

const AUTH_ENDPOINT = '/api/v1/login';

export async function login(email, password, keyPass) {
  try {
    const response = await apiClient.post(AUTH_ENDPOINT, {
      email,
      password,
      key_pass: keyPass,
    });

    const payload = response?.data;
    const root = payload?.data?.data ? payload.data : payload;

    const success = root?.success;
    const message = root?.message;
    const token = root?.data?.token?.token || root?.token?.token || null;
    const user = root?.data?.user || root?.user || null;

    if (!success || !token) {
      console.error('❌ Unexpected login response:', response?.data);
      throw new Error(message || 'No token found in login response');
    }

    localStorage.setItem('spa_auth_token', token);

    if (user) {
      localStorage.setItem('spa_user', JSON.stringify(user));
    }

    return { token, user };
  } catch (error) {
    console.error('❌ Login failed:', error?.response?.data || error.message);
    throw error;
  }
}

export function hasToken() {
  return !!localStorage.getItem('spa_auth_token');
}

export function getStoredToken() {
  return localStorage.getItem('spa_auth_token');
}

export function getStoredUser() {
  const userJson = localStorage.getItem('spa_user');
  return userJson ? JSON.parse(userJson) : null;
}

export function logout() {
  localStorage.removeItem('spa_auth_token');
  localStorage.removeItem('spa_user');
}