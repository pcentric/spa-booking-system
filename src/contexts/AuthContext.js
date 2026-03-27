// Authentication Context — token, user, login/logout, session restoration
import React, { useReducer, useEffect, useCallback } from 'react';
import { login as loginService, getStoredToken, getStoredUser, logout as logoutService } from '../services/authService';
import { registerUnauthorizedCallback } from '../services/apiClient';
import logger from '../utils/logger';

const AuthContext = React.createContext(null);

const initialState = {
  user: { id: 1, name: 'Demo User', email: 'demo@example.com' },
  token: 'demo-token',
  isAuthenticated: true,
  isLoading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return { ...state, isLoading: true, error: null };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        token: null,
        user: null,
        isAuthenticated: false,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };

    case 'RESTORE_SESSION':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };

    case 'RESTORE_SESSION_FAILED':
      return {
        ...initialState,
        isLoading: false,
      };

    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Demo mode: auth is pre-authenticated
  useEffect(() => {
    logger.info('Auth', 'Running in demo mode — pre-authenticated');
  }, []);

  // Register 401 callback with apiClient
  useEffect(() => {
    registerUnauthorizedCallback(() => {
      logger.warn('Auth', '401 Unauthorized — logging out');
      dispatch({ type: 'LOGOUT' });
    });
  }, []);

  const login = useCallback(async (email, password, keyPass) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    try {
      const result = await loginService(email, password, keyPass);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: result,
      });
      logger.info('Auth', 'Login successful');
      return result;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMsg });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    logoutService();
    dispatch({ type: 'LOGOUT' });
    logger.info('Auth', 'Logged out');
  }, []);

  const value = {
    ...state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
