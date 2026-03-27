// UI Context — pure sync state (no async)
// Panel open/close, modal, toasts, selected date, etc.
import React, { useReducer, useCallback } from 'react';
import logger from '../utils/logger';

const UIContext = React.createContext(null);

const initialState = {
  isPanelOpen: false,
  panelMode: 'detail', // 'detail' | 'create' | 'edit'
  panelBookingId: null,
  isModalOpen: false,
  modalType: null,
  modalData: null,
  toasts: [], // [{ id, message, type: 'success'|'error'|'info', ttl: ms }]
  selectedDate: new Date(),
  sidebarCollapsed: false,
};

function uiReducer(state, action) {
  switch (action.type) {
    case 'OPEN_PANEL':
      return {
        ...state,
        isPanelOpen: true,
        panelMode: action.payload.mode || 'detail',
        panelBookingId: action.payload.bookingId || null,
      };

    case 'CLOSE_PANEL':
      return { ...state, isPanelOpen: false, panelMode: 'detail', panelBookingId: null };

    case 'OPEN_MODAL':
      return {
        ...state,
        isModalOpen: true,
        modalType: action.payload.type,
        modalData: action.payload.data,
      };

    case 'CLOSE_MODAL':
      return { ...state, isModalOpen: false, modalType: null, modalData: null };

    case 'ADD_TOAST': {
      const id = Date.now();
      const toast = {
        id,
        message: action.payload.message,
        type: action.payload.type || 'info',
        ttl: action.payload.ttl || 5000,
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'SET_SIDEBAR':
      return { ...state, sidebarCollapsed: action.payload };

    default:
      return state;
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const openPanel = useCallback((mode = 'detail', bookingId = null) => {
    dispatch({ type: 'OPEN_PANEL', payload: { mode, bookingId } });
    logger.debug('UI', 'Panel opened', { mode, bookingId });
  }, []);

  const closePanel = useCallback(() => {
    dispatch({ type: 'CLOSE_PANEL' });
  }, []);

  const openModal = useCallback((type, data = null) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type, data } });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const addToast = useCallback((message, type = 'info', ttl = 5000) => {
    dispatch({ type: 'ADD_TOAST', payload: { message, type, ttl } });
    logger.debug('UI', 'Toast added', { message, type });

    // Auto-remove after TTL
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: Date.now() });
    }, ttl);
  }, []);

  const removeToast = useCallback((toastId) => {
    dispatch({ type: 'REMOVE_TOAST', payload: toastId });
  }, []);

  const setSelectedDate = useCallback((date) => {
    // Convert string dates (YYYY-MM-DD) to Date objects
    let dateObj = date;
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-');
      dateObj = new Date(year, parseInt(month) - 1, parseInt(day));
    }
    dispatch({ type: 'SET_SELECTED_DATE', payload: dateObj });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setSidebar = useCallback((collapsed) => {
    dispatch({ type: 'SET_SIDEBAR', payload: collapsed });
  }, []);

  const value = {
    isPanelOpen: state.isPanelOpen,
    panelMode: state.panelMode,
    panelBookingId: state.panelBookingId,
    isModalOpen: state.isModalOpen,
    modalType: state.modalType,
    modalData: state.modalData,
    toasts: state.toasts,
    selectedDate: state.selectedDate,
    sidebarCollapsed: state.sidebarCollapsed,
    openPanel,
    closePanel,
    openModal,
    closeModal,
    addToast,
    removeToast,
    setSelectedDate,
    toggleSidebar,
    setSidebar,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export default UIContext;
