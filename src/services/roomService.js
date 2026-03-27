// Room service — get available rooms and bed types
import apiClient from './apiClient';
import logger from '../utils/logger';
import { toApiDate } from '../utils/dateUtils';

/**
 * Get available rooms for a specific date and duration
 * GET /room-bookings/outlet/{outlet_id}
 *
 * API returns nested structure: Array of capacity categories, each containing items with rooms
 * Transforms to flat array of rooms with standardized field names
 */
export async function getAvailableRooms(outlet, date, duration = 60) {
  try {
    logger.debug('Room', 'Fetching available rooms', { outlet, date, duration });

    const dateStr = typeof date === 'string' ? date : toApiDate(date);

    const params = {
      date: dateStr, // DD-MM-YYYY
      panel: 'outlet',
      duration,
    };

    const response = await apiClient.get(`/api/v1/room-bookings/outlet/${outlet}`, { params });

    // API returns array of capacity categories
    const capacityGroups = response.data.data || response.data || [];

    // Flatten nested structure: capacity_group > items > rooms
    const rooms = [];

    if (Array.isArray(capacityGroups)) {
      capacityGroups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          group.items.forEach(item => {
            if (item.room_id && item.room_name) {
              rooms.push({
                id: item.room_id,
                name: item.room_name,
                code: item.room_code,
                item_name: item.item_name,
                item_category: item.item_category,
                capacity_type: item.capacity_type,
                bookings: item.bookings || [], // Existing bookings for this room
              });
            }
          });
        }
      });
    }
    logger.info('Room', `Fetched ${rooms.length} available rooms`);
    return rooms;
  } catch (error) {
    logger.error('Room', 'Failed to fetch available rooms', error);
    throw error;
  }
}

/**
 * Get rooms for a specific therapist/service/date
 */
export async function getRoomsForService(outlet, date, duration, serviceId = null, therapistId = null) {
  try {
    const params = {
      date: typeof date === 'string' ? date : toApiDate(date),
      panel: 'outlet',
      duration,
    };

    if (serviceId) {
      params.service_id = serviceId;
    }
    if (therapistId) {
      params.user_id = therapistId;
    }

    const response = await apiClient.get(`/api/v1/room-bookings/outlet/${outlet}`, { params });
    return response.data.data || response.data;
  } catch (error) {
    logger.error('Room', 'Failed to fetch rooms for service', error);
    throw error;
  }
}
