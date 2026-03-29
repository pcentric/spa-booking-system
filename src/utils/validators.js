// Booking form validation rules

export const validators = {
  customer_name: {
    validate: (value) => value && value.trim().length >= 2,
    message: 'Customer name is required (min 2 characters)',
  },
  customer_email: {
    // Optional — only validated if a value is provided
    validate: (value) => !value || !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
    message: 'Enter a valid email address (e.g. name@example.com)',
  },
  customer_phone: {
    // Must start with + followed by country code (1–3 digits) then at least 6 local digits
    // Strips spaces, dashes, parentheses before checking
    validate: (value) => {
      if (!value || !value.trim()) return false;
      const stripped = value.trim().replace(/[\s\-().]/g, '');
      return /^\+[1-9]\d{7,14}$/.test(stripped);
    },
    message: 'Phone must include country code (e.g. +65 9123 4567 or +91 98765 43210)',
  },
  service_at: {
    validate: (value) => value && value.trim().length > 0,
    message: 'Date is required',
  },
  source: {
    validate: (value) => value && value.trim().length > 0,
    message: 'Source is required',
  },
  payment_type: {
    validate: (value) => value && value.trim().length > 0,
    message: 'Payment type is required',
  },
};

export const itemValidators = {
  service_id: {
    validate: (value) => value && value > 0,
    message: 'Service is required',
  },
  therapist_id: {
    validate: (value) => value && value > 0,
    message: 'Therapist is required',
  },
  start_time: {
    validate: (value) => value && /^\d{2}:\d{2}$/.test(value),
    message: 'Valid start time is required',
  },
  duration: {
    validate: (value) => value && value > 0,
    message: 'Duration must be greater than 0',
  },
};

/**
 * Validate entire booking form
 */
export function validateBookingForm(formData) {
  const errors = {};

  // Validate main fields
  Object.entries(validators).forEach(([field, rules]) => {
    if (!rules.validate(formData[field])) {
      errors[field] = rules.message;
    }
  });

  // Validate items
  if (!formData.items || formData.items.length === 0) {
    errors.items = 'At least one service is required';
  } else {
    const itemErrors = [];
    formData.items.forEach((item, index) => {
      const itemError = validateItem(item);
      if (Object.keys(itemError).length > 0) {
        itemErrors.push({ index, errors: itemError });
      }
    });
    if (itemErrors.length > 0) {
      errors.items = itemErrors;
    }
  }

  return errors;
}

/**
 * Validate single item
 */
export function validateItem(item) {
  const errors = {};

  Object.entries(itemValidators).forEach(([field, rules]) => {
    if (!rules.validate(item[field])) {
      errors[field] = rules.message;
    }
  });

  return errors;
}

/**
 * Check if form has any errors
 */
export function hasFormErrors(errors) {
  if (!errors || typeof errors !== 'object') return false;
  return Object.keys(errors).length > 0;
}

/**
 * Get all error messages as strings
 */
export function getErrorMessages(errors) {
  const messages = [];

  Object.entries(errors).forEach(([field, error]) => {
    if (typeof error === 'string') {
      messages.push(error);
    } else if (Array.isArray(error)) {
      error.forEach(itemError => {
        Object.values(itemError.errors).forEach(msg => {
          messages.push(`Service ${itemError.index + 1}: ${msg}`);
        });
      });
    }
  });

  return messages;
}
