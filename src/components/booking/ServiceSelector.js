import React from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import Select from '../common/Select';

const ServiceSelector = ({ value, onChange, label = 'Service', error }) => {
  const { services, isLoadingServices } = useMasterData();

  const serviceOptions = services.map(service => ({
    value: service.id,
    label: service.name || service.service_name,
  }));

  return (
    <div>
      <Select
        label={label}
        value={value}
        onChange={onChange}
        options={serviceOptions}
        placeholder="Select a service"
        disabled={isLoadingServices || serviceOptions.length === 0}
        required
        error={error}
      />
      {serviceOptions.length === 0 && !isLoadingServices && (
        <p className="text-yellow-600 text-sm mt-1">No services available. Please check master data.</p>
      )}
    </div>
  );
};

export default ServiceSelector;
