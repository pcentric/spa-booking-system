import apiClient from './apiClient';
import logger from '../utils/logger';

/**
 * Therapist Response Cache
 * Prevents duplicate API calls for the same time/outlet/service combination
 * Cache key format: `outlet|serviceAt|serviceId|availability`
 * Cache TTL: 5 minutes
 *
 * Why: Therapist data is relatively static within a 5-minute window, but
 * calendars may re-mount or users may scroll through bookings repeatedly.
 * This prevents hammering the API with therapist requests.
 */
const therapistCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(outlet, serviceAt, serviceId, availability) {
  return `${outlet}|${serviceAt}|${serviceId ?? 'all'}|${availability}`;
}

function getCachedTherapists(cacheKey) {
  const cached = therapistCache.get(cacheKey);
  if (!cached) return null;

  // Check if cache expired
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    therapistCache.delete(cacheKey);
    return null;
  }

  return cached.therapists;
}

function setCachedTherapists(cacheKey, therapists) {
  therapistCache.set(cacheKey, {
    therapists,
    timestamp: Date.now(),
  });
}

/**
 * Get therapists
 * GET /therapists
 * Results are cached to avoid duplicate requests for same parameters
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

    // Check cache first to avoid unnecessary API calls
    const cacheKey = getCacheKey(outlet, serviceAt, serviceId, availability);
    const cachedTherapists = getCachedTherapists(cacheKey);
    if (cachedTherapists) {
      logger.debug('Therapist', `Cache hit: ${cachedTherapists.length} therapists`);
      return cachedTherapists;
    }

    logger.debug('Therapist', 'Cache miss, fetching therapists', filters);

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

    // Store in cache for future requests
    setCachedTherapists(cacheKey, therapistArray);

    logger.info(
      'Therapist',
      `Fetched ${therapistArray.length} therapists (new request)`
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
 * Also uses response caching like getTherapists
 */
export async function getAllTherapists(serviceAt, outlet = 1) {
  try {
    if (!serviceAt) {
      throw new Error('serviceAt is required to fetch therapists');
    }

    // Check cache first
    const cacheKey = getCacheKey(outlet, serviceAt, null, 0); // 0 = availability: 0 (all therapists)
    const cachedTherapists = getCachedTherapists(cacheKey);
    if (cachedTherapists) {
      logger.debug('Therapist', `Cache hit: ${cachedTherapists.length} all therapists`);
      return cachedTherapists;
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

    // Store in cache
    setCachedTherapists(cacheKey, therapistArray);

    logger.info('Therapist', `Fetched ${therapistArray.length} all active therapists (new request)`);
    return therapistArray;
  } catch (error) {
    logger.error('Therapist', 'Failed to fetch all therapists', error?.response?.data || error.message || error);
    throw error;
  }
}