import React, { useState, useEffect } from 'react';
import { useBookings } from '../../hooks/useBookings';
import { useUI } from '../../hooks/useUI';
import { useAuth } from '../../hooks/useAuth';
import useMergedTherapists from '../../hooks/useMergedTherapists';
import logger from '../../utils/logger';
import { validateBookingForm, getErrorMessages } from '../../utils/validators';
import { transformEditToApi, transformItemToApi } from '../../utils/bookingTransform';
import {
  apiDateToHtmlDate,
  getBookingMinHtmlDate,
  isValidCreateBookingDate,
  isValidEditBookingDate,
} from '../../utils/dateUtils';
import { calculateEndTime } from '../../utils/timeUtils';
import Input from '../common/Input';
import Select from '../common/Select';
import BookingItemRow from './BookingItemRow';

const BookingForm = React.forwardRef(({ booking, initialData, onSuccess }, ref) => {
  const { createBooking, updateBooking, isSubmitting } = useBookings();
  const { addToast, openModal, closeModal } = useUI();
  const { user } = useAuth();
  const therapists = useMergedTherapists();
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_at: '',
    source: 'Walk-in',
    payment_type: 'payatstore',
    items: [
      {
        service_id: '',
        therapist_id: '',
        start_time: '',
        duration: 60,
        room_id: '',
      },
    ],
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});

useEffect(() => {
  if (booking) {
    const snapshot = JSON.stringify({
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      service_at: booking.date,
      items: booking.items?.map(i => ({
        service_id: i.service_id,
        therapist_id: i.therapist_id,
        start_time: i.start_time,
      })),
    });

    setInitialSnapshot(snapshot);
  }
}, [booking]);

  // Apply initial data from calendar slot click (for create mode)
  useEffect(() => {
    if (initialData && !booking) {
      logger.debug('BookingForm', 'Applying initial data from calendar slot', {
        date: initialData.date,
        time: initialData.time,
        therapist_id: initialData.therapist_id,
      });

      // Calculate end time from start time and default duration
      const endTime = calculateEndTime(initialData.time || '09:00', 60);

      setFormData(prev => ({
        ...prev,
        service_at: initialData.date || prev.service_at,
        items: [
          {
            ...prev.items[0],
            start_time: initialData.time || prev.items[0].start_time,
            end_time: endTime,
            therapist_id: initialData.therapist_id || prev.items[0].therapist_id,
          },
        ],
      }));
    }
  }, [initialData, booking]);
  // Initialize form with booking data if editing
  useEffect(() => {
    if (booking) {
      logger.debug('BookingForm', 'Initializing edit mode', { bookingId: booking.id });

      // Normalize items to ensure correct structure
      let items = [];
      if (booking.items?.length > 0) {
        items = booking.items.map(item => ({
          service_id: item.service_id || item.service || '',
          therapist_id: item.therapist_id || item.therapist || '',
          start_time: typeof item.start_time === 'string' ? item.start_time : '',
          end_time: typeof item.end_time === 'string' ? item.end_time : '',
          duration: parseInt(item.duration) || 60,
          room_id: item.room_id || '',
        }));
      } else {
        items = [
          {
            service_id: booking.service_id || '',
            therapist_id: booking.therapist_id || '',
            start_time: typeof booking.start_time === 'string' ? booking.start_time : '',
            end_time: typeof booking.end_time === 'string' ? booking.end_time : '',
            duration: parseInt(booking.duration) || 60,
            room_id: booking.room_id || '',
          },
        ];
      }

      setFormData({
        customer_name: booking.customer_name || '',
        customer_email: booking.customer_email || '',
        customer_phone: booking.customer_phone || '',
        service_at: apiDateToHtmlDate(booking.date) || '',
        source: booking.source || 'Walk-in',
        payment_type: booking.payment_type || 'payatstore',
        items,
        notes: booking.notes || '',
        service_id: booking.service_id,
  therapist_id: booking.therapist_id,
      });
    }
  }, [booking]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleItemUpdate = (index, updatedItem) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
    logger.debug('BookingForm', 'Item updated', { index, itemId: updatedItem.service_id });
  };

  const handleItemRemove = (index) => {
    if (formData.items.length === 1) {
      addToast('You must have at least one service', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    logger.debug('BookingForm', 'Item removed', { index });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          service_id: '',
          therapist_id: '',
          start_time: '',
          duration: 60,
          room_id: '',
        },
      ],
    }));
    logger.debug('BookingForm', 'New item added');
  };

  const handleSubmit = async (e) => {
    if (booking && !isDirty) {
      addToast('No changes detected', 'info');
      return;
    }
    e.preventDefault();
    logger.debug('BookingForm', 'Form submitted', { isEditing: !!booking });
    const isEditing = !!booking;

    if (isEditing) {
      if (!isValidEditBookingDate(formData.service_at)) {
        openModal('error', {
          title: 'Invalid Date',
          message: 'Invalid booking date.',
          buttonText: 'OK',
        });
        return;
      }
    } else {
      if (!isValidCreateBookingDate(formData.service_at)) {
        openModal('error', {
          title: 'Invalid Date',
          message: 'Previous date booking cannot be created.',
          buttonText: 'OK',
        });
        return;
      }
    }
    // Validate form
    const validationErrors = validateBookingForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      logger.warn('BookingForm', 'Validation errors', validationErrors);

      // Separate main errors from item errors
      const mainErrors = { ...validationErrors };
      let itemErrorsMap = {};

      if (Array.isArray(validationErrors.items)) {
        // Extract item errors into a map for easier lookup
        validationErrors.items.forEach(itemError => {
          itemErrorsMap[itemError.index] = itemError.errors;
        });
        delete mainErrors.items; // Remove items array from main errors
      }

      setErrors(mainErrors);
      setItemErrors(itemErrorsMap);

      // Show all error messages as toasts
      const messages = getErrorMessages(validationErrors);
      messages.forEach(msg => addToast(msg, 'error'));
      return;
    }

    // Clear errors if validation passes
    setErrors({});
    setItemErrors({});

    try {
      // Transform items to API format - pass customer name to each item
      const apiItems = formData.items.map((item, idx) =>
        transformItemToApi(item, idx, formData.customer_name)
      );

      let submitData;
      if (booking) {
        // Edit mode - transform with customer_id from existing booking
        submitData = transformEditToApi({
          ...formData,
          customer_id: booking.customer_id,
          service_at: `${formData.service_at} ${formData.items[0]?.start_time || '09:00'}:00`,
          items: apiItems,
          updated_by: user?.id || 1,
        });
        logger.debug('BookingForm', 'Submitting edit', { bookingId: booking.id });
        await updateBooking(booking.id, submitData, booking);

        // Show success modal
        openModal('success', {
          title: 'Booking Updated',
          message: 'Your appointment has been successfully updated.',
          buttonText: 'OK',
        });

        // Close modal after 2 seconds and call success callback
        setTimeout(() => {
          closeModal();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      } else {
        // Create mode - pass raw data to context, which will create customer first
        // Then context will transform with the new customer_id
        const rawBookingData = {
          ...formData,
          service_at: `${formData.service_at} ${formData.items[0]?.start_time || '09:00'}:00`,
          items: apiItems,
          created_by: user?.id || 1,
        };
        logger.debug('BookingForm', 'Submitting create with form data');
        await createBooking(rawBookingData);

        // Show success modal
        openModal('success', {
          title: 'Booking Created',
          message: 'Your appointment has been successfully created.',
          buttonText: 'OK',
        });

        // Close modal after 2 seconds and call success callback
        setTimeout(() => {
          closeModal();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('BookingForm: Submission error:', error);
      logger.error('BookingForm', 'Form submission failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Show specific error messages
      let errorMsg = error.message || 'Failed to save booking';

      if (error.response?.status === 422 && error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.status === 422 && error.response?.data?.errors) {
        const fields = Object.keys(error.response.data.errors);
        errorMsg = `Missing or invalid: ${fields.join(', ')}`;
      }

      // Show error modal
      openModal('error', {
        title: 'Booking Failed',
        message: errorMsg,
        buttonText: 'Try Again',
      });
    }
  };

  const sourceOptions = [
    { value: 'Walk-in', label: 'Walk-in' },
    { value: 'Phone', label: 'Phone' },
    { value: 'WhatsApp', label: 'WhatsApp' },
  ];

  const paymentOptions = [
    { value: 'payatstore', label: 'Pay at Store' },
    { value: 'paynow', label: 'PayNow' },
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
  ];

  const currentSnapshot = JSON.stringify({
    customer_name: formData.customer_name,
    customer_phone: formData.customer_phone,
    service_at: formData.service_at,
    items: formData.items?.map(i => ({
      service_id: i.service_id,
      therapist_id: i.therapist_id,
      start_time: i.start_time,
    })),
  });
  
  const isDirty = !booking || currentSnapshot !== initialSnapshot;

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
        <div className="space-y-3">
          <Input
            label="Customer Name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleInputChange}
            placeholder="Enter customer name"
            required
            error={errors.customer_name}
          />
          <Input
            label="Email"
            name="customer_email"
            type="email"
            value={formData.customer_email}
            onChange={handleInputChange}
            placeholder="Enter email address (optional)"
            error={errors.customer_email}
          />
          <Input
            label="Phone"
            name="customer_phone"
            value={formData.customer_phone}
            onChange={handleInputChange}
            placeholder="Enter phone number"
            required
            error={errors.customer_phone}
          />
        </div>
      </div>

      {/* Booking Information */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Booking Information</h3>
        <div className="space-y-3">
          <Input
            label="Date"
            name="service_at"
            type="date"
            value={formData.service_at}
            onChange={handleInputChange}
            required
            error={errors.service_at}
            min={getBookingMinHtmlDate(booking ? 'edit' : 'create')}
          />
          <Select
            label="Source"
            name="source"
            value={formData.source}
            onChange={handleInputChange}
            options={sourceOptions}
            required
            error={errors.source}
          />
          <Select
            label="Payment Type"
            name="payment_type"
            value={formData.payment_type}
            onChange={handleInputChange}
            options={paymentOptions}
            required
            error={errors.payment_type}
          />
        </div>
      </div>

      {/* Services */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Services</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
            disabled={isSubmitting}
          >
            + Add Service
          </button>
        </div>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <BookingItemRow
              key={index}
              item={item}
              itemIndex={index}
              date={formData.service_at}
              onUpdate={handleItemUpdate}
              onRemove={handleItemRemove}
              error={itemErrors[index]}
              therapists={therapists}
            />
          ))}
          {errors.items && typeof errors.items === 'string' && (
            <p className="text-red-600 text-sm">{errors.items}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="border-b border-gray-200 pb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Add any notes about this booking"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* Submit Buttons */}
      <div className="space-y-2 pt-4">
      <button
  type="submit"
  disabled={isSubmitting || (booking && !isDirty)}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : (booking ? 'Update Booking' : 'Create Booking')}
        </button>
      </div>
    </form>
  );
});

export default BookingForm;
