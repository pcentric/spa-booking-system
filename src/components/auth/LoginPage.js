import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { logger } from '../../utils/logger.js';
import Input from '../common/Input.js';
import Button from '../common/Button.js';
import LoadingSpinner from '../common/LoadingSpinner.js';

const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: 'user@spa.local',
    password: 'password123',
    key_pass: 'key123',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.key_pass) errors.key_pass = 'Key pass is required';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    logger.info('LoginPage: Attempting login', { email: formData.email });
    await login(formData.email, formData.password, formData.key_pass);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner label="Logging in..." />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Spa Booking</h1>
        <p className="text-gray-600 text-center mb-6">Management System</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
            placeholder="Enter your password"
          />

          <Input
            label="Key Pass"
            type="password"
            name="key_pass"
            value={formData.key_pass}
            onChange={handleChange}
            error={fieldErrors.key_pass}
            required
            placeholder="Enter your key pass"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-6">
          Demo credentials are pre-filled
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
