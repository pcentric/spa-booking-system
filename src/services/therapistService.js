import apiClient from './apiClient';
import logger from '../utils/logger';

/**
 * Get therapists
 * GET /therapists
 */
export async function getTherapists(filters = {}) {
  try {
    const {
      outlet = 1,
      serviceAt,
      serviceId = null,
      availability = 1,
      status = 1,
    } = filters;

    if (!serviceAt) {
      throw new Error('serviceAt is required to fetch therapists');
    }

    logger.debug('Therapist', 'Fetching therapists', filters);

    const params = {
      outlet,
      service_at: serviceAt, // required by API
      availability,
      status,
      pagination: 0,
      panel: 'outlet',
      outlet_type: 2,
      leave: 0,
    };

    if (serviceId) {
      params.services = serviceId;
    }

    const response = await apiClient.get('/api/v1/therapists', { params });

    // API returns therapists in response.data.data.data.list.staffs (or nested variations)
    const therapists = response?.data?.data?.data?.list?.staffs || response?.data?.data?.list || response?.data?.data || response?.data || [];
    const therapistArray = Array.isArray(therapists) ? therapists : [];

    logger.info(
      'Therapist',
      `Fetched ${therapistArray.length} therapists`
    );

    return therapistArray;
  } catch (error) {
    logger.error(
      'Therapist',
      'Failed to fetch therapists',
      error?.response?.data || error.message || error
    );
    throw error;
  }
}

/**
 * Get available therapists for a specific service at a specific time
 */
export async function getAvailableTherapists(serviceId, serviceAt, outlet = 1) {
  return getTherapists({
    outlet,
    serviceAt,
    serviceId,
    availability: 1,
    status: 1,
  });
}

/**
 * Get all active therapists (for calendar view - not filtered by availability)
 */
export async function getAllTherapists(serviceAt, outlet = 1) {
  try {
    if (!serviceAt) {
      throw new Error('serviceAt is required to fetch therapists');
    }

    const params = {
      outlet,
      service_at: serviceAt, // Required by API
      availability: 0, // Get all therapists, not just available
      status: 1, // Only active ones
      pagination: 0,
      panel: 'outlet',
      outlet_type: 2,
      leave: 0,
    };

    const response = await apiClient.get('/api/v1/therapists', { params });
    const therapists = response?.data?.data?.data?.list?.staffs || response?.data?.data?.list || response?.data?.data || response?.data || [];
    const therapistArray = Array.isArray(therapists) ? therapists : [];

    logger.info('Therapist', `Fetched ${therapistArray.length} all active therapists`);
    return therapistArray;
  } catch (error) {
    logger.error('Therapist', 'Failed to fetch all therapists', error?.response?.data || error.message || error);
    throw error;
  }
}