// Master Data Context — therapists, services, rooms (reference data)
import React, { useReducer, useCallback, useEffect } from 'react';
import * as therapistService from '../services/therapistService';
import * as serviceService from '../services/serviceService';
import * as roomService from '../services/roomService';
import logger from '../utils/logger';

const MasterDataContext = React.createContext(null);

const initialState = {
  therapists: [],
  services: [],
  outlets: [],
  rooms: new Map(), // Keyed by "date_outlet"
  isLoadingTherapists: false,
  isLoadingServices: false,
  isLoadingRooms: false,
  error: null,
};

function masterDataReducer(state, action) {
  switch (action.type) {
    case 'LOAD_THERAPISTS_REQUEST':
      return { ...state, isLoadingTherapists: true, error: null };

    case 'LOAD_THERAPISTS_SUCCESS':
      return { ...state, therapists: action.payload, isLoadingTherapists: false };

    case 'LOAD_THERAPISTS_FAILURE':
      return { ...state, isLoadingTherapists: false, error: action.payload };

    case 'LOAD_SERVICES_REQUEST':
      return { ...state, isLoadingServices: true };

    case 'LOAD_SERVICES_SUCCESS':
      return { ...state, services: action.payload, isLoadingServices: false };

    case 'LOAD_ROOMS_REQUEST':
      return { ...state, isLoadingRooms: true };

    case 'LOAD_ROOMS_SUCCESS': {
      const roomsMap = new Map(state.rooms);
      const key = action.payload.key;
      roomsMap.set(key, action.payload.rooms);
      return { ...state, rooms: roomsMap, isLoadingRooms: false };
    }

    case 'INVALIDATE_ROOMS': {
      // Clear rooms cache after a booking change
      return { ...state, rooms: new Map() };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

export function MasterDataProvider({ children }) {
  const [state, dispatch] = useReducer(masterDataReducer, initialState);

  // Load services on mount (therapists are fetched on-demand via getAvailableTherapists callback)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'LOAD_SERVICES_REQUEST' });
        const services = await serviceService.getServices();
        dispatch({ type: 'LOAD_SERVICES_SUCCESS', payload: services });

        logger.info('MasterData', 'Services loaded', {
          services: services?.length,
        });
      } catch (error) {
        logger.error('MasterData', 'Failed to load services', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load services' });
      }
    };

    loadInitialData();
  }, []);

  const loadRooms = useCallback(async (date, outlet = 1, duration = 60) => {
    const key = `${date}_${outlet}`;

    // Check if already cached
    if (state.rooms.has(key)) {
      return state.rooms.get(key);
    }

    dispatch({ type: 'LOAD_ROOMS_REQUEST' });
    try {
      const rooms = await roomService.getAvailableRooms(outlet, date, duration);
      dispatch({ type: 'LOAD_ROOMS_SUCCESS', payload: { key, rooms } });
      return rooms;
    } catch (error) {
      logger.error('MasterData', 'Failed to load rooms', error);
      return [];
    }
  }, [state.rooms]);

  const loadTherapists = useCallback(async (serviceAt, outlet = 1) => {
    dispatch({ type: 'LOAD_THERAPISTS_REQUEST' });
    try {
      // Load ALL active therapists (not filtered by availability)
      // This ensures bookings assigned to unavailable therapists still show on calendar
      const list = await therapistService.getAllTherapists(serviceAt, outlet);
      // Ensure we have an array
      const therapistsArray = Array.isArray(list) ? list : [];
      dispatch({ type: 'LOAD_THERAPISTS_SUCCESS', payload: therapistsArray });
      logger.info('MasterData', 'All therapists loaded', { count: therapistsArray?.length });
      return therapistsArray;
    } catch (error) {
      logger.error('MasterData', 'Failed to load therapists', error);
      dispatch({ type: 'LOAD_THERAPISTS_FAILURE', payload: 'Failed to load therapists' });
      return [];
    }
  }, []);

  const getAvailableTherapists = useCallback(async (serviceId, serviceAt, outlet = 1) => {
    try {
      const therapists = await therapistService.getAvailableTherapists(serviceId, serviceAt, outlet);
      logger.debug('MasterData', 'Fetched available therapists', { serviceId, serviceAt });
      return therapists;
    } catch (error) {
      logger.error('MasterData', 'Failed to fetch available therapists', error);
      return [];
    }
  }, []);

  const invalidateRooms = useCallback(() => {
    dispatch({ type: 'INVALIDATE_ROOMS' });
  }, []);

  const value = {
    therapists: state.therapists,
    services: state.services,
    rooms: state.rooms,
    isLoadingTherapists: state.isLoadingTherapists,
    isLoadingServices: state.isLoadingServices,
    isLoadingRooms: state.isLoadingRooms,
    error: state.error,
    loadTherapists,
    loadRooms,
    getAvailableTherapists,
    invalidateRooms,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export default MasterDataContext;
