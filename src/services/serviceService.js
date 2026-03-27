// Service (massage type) service — get available services
import apiClient from './apiClient';
import logger from '../utils/logger';

/**
 * Get service categories and services
 * GET /api/v1/service-category
 */
export async function getServices(filters = {}) {
  try {
    const {
      outlet = 1,
      outletType = 2,
    } = filters;

    logger.debug('Service', 'Fetching services', filters);

    const params = {
      outlet,
      outlet_type: outletType,
      pagination: 0,
      panel: 'outlet',
    };

    const response = await apiClient.get('/api/v1/service-category', { params });

    console.log('serviceService.getServices response structure:',response?.data?.data?.data?.list?.category, JSON.stringify(response?.data, null, 2));

    // API returns services in nested structure: { data: { data: [...] } }
    const services = response?.data?.data?.data?.list?.category || [];
    console.log(services, "whathahra")
    const servicesArray = Array.isArray(services) ? services : [];

    logger.info('Service', `Fetched ${servicesArray.length} services`);
    console.log('Extracted services:', servicesArray);
    return servicesArray;
  } catch (error) {
    logger.error('Service', 'Failed to fetch services', error?.response?.data || error.message);
    throw error;
  }
}
