import { Alert } from 'react-native';

/**
 * Categorizes and formats errors into user-friendly, descriptive messages
 * with appropriate titles, explanations, and actionable guidance.
 */
export const parseError = (error, fallbackMessage = 'An unexpected error occurred. Please try again.') => {
  if (!error) {
    return {
      title: 'Notice',
      message: fallbackMessage,
      type: 'unknown',
    };
  }

  const rawMessage = (typeof error === 'string' ? error : error.message || error.error || '').trim();
  const status = error.status || error.statusCode || 0;

  // 1. Network & Connectivity Errors
  if (
    rawMessage.includes('Network request failed') ||
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('Unable to connect') ||
    rawMessage.includes('ENOTFOUND') ||
    rawMessage.includes('ECONNREFUSED') ||
    rawMessage.includes('NetworkError')
  ) {
    return {
      title: 'Connection Error',
      message: 'Unable to reach the server. Please check your internet connection or Wi-Fi and try again.',
      type: 'network',
    };
  }

  if (rawMessage.includes('timeout') || rawMessage.includes('timed out') || rawMessage.includes('ETIMEDOUT')) {
    return {
      title: 'Connection Timeout',
      message: 'The server took too long to respond. Please check your network connection and retry.',
      type: 'network',
    };
  }

  // 2. Authentication & Authorization Errors
  if (status === 401 || rawMessage.includes('Token missing') || rawMessage.includes('Invalid or expired token') || rawMessage.includes('Unauthorized')) {
    return {
      title: 'Session Expired',
      message: 'Your login session has expired or is invalid. Please sign in again to continue.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('Incorrect password') || rawMessage.includes('Invalid credentials')) {
    return {
      title: 'Incorrect Credentials',
      message: 'The email/ID or password you entered is incorrect. Please verify your details and try again.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('User not found') || rawMessage.includes('No active customer found')) {
    return {
      title: 'Account Not Found',
      message: 'No registered account found matching these details. Please check your spelling or sign up.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('deactivated') || rawMessage.includes('terminated')) {
    return {
      title: 'Account Suspended',
      message: 'This account or shop has been deactivated by the platform administrator. Please contact customer care for assistance.',
      type: 'forbidden',
    };
  }

  if (status === 403 || rawMessage.includes('Forbidden') || rawMessage.includes('Only shop owner')) {
    return {
      title: 'Access Restricted',
      message: 'You do not have administrative permission to perform this action.',
      type: 'forbidden',
    };
  }

  // 3. Validation & Duplicate Errors
  if (rawMessage.includes('already registered') || rawMessage.includes('already in use') || rawMessage.includes('already exists')) {
    return {
      title: 'Already Registered',
      message: 'An account with this phone number or email is already registered. Please log in instead or use another number.',
      type: 'validation',
    };
  }

  if (rawMessage.includes('10-digit') || (rawMessage.includes('phone') && rawMessage.includes('valid'))) {
    return {
      title: 'Invalid Mobile Number',
      message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).',
      type: 'validation',
    };
  }

  if (rawMessage.includes('PIN must be') || rawMessage.includes('Incorrect 4-digit PIN') || rawMessage.includes('Current PIN is incorrect')) {
    return {
      title: 'PIN Error',
      message: rawMessage || 'Security PIN must be exactly 4 numeric digits.',
      type: 'validation',
    };
  }

  // 4. Business Logic Errors
  if (rawMessage.includes('Shop closed') || rawMessage.includes('shop is currently closed')) {
    return {
      title: 'Store Closed',
      message: 'This store is currently closed and cannot accept orders right now.',
      type: 'business',
    };
  }

  if (rawMessage.includes('Add to Book') || rawMessage.includes('Khata')) {
    return {
      title: 'Khata Record Error',
      message: rawMessage || 'A registered customer must be selected to record a Khata entry.',
      type: 'business',
    };
  }

  // 5. Server Errors (5xx)
  if (status >= 500 || rawMessage.includes('Internal Server Error') || rawMessage.includes('Database error')) {
    return {
      title: 'Server Error',
      message: 'Our server encountered an unexpected error. Please try again in a moment.',
      type: 'server',
    };
  }

  // Generic fallback
  return {
    title: 'Notice',
    message: rawMessage || fallbackMessage,
    type: 'unknown',
  };
};

/**
 * Standardized Alert Dialog with clean title and actionable message
 */
export const showErrorAlert = (error, defaultTitle = 'Notice', defaultMessage = 'An unexpected error occurred.') => {
  const parsed = parseError(error, defaultMessage);
  Alert.alert(parsed.title || defaultTitle, parsed.message);
};

/**
 * Phone Number Validator (Strict 10-digit Indian format)
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.toString().trim()) {
    return { valid: false, error: 'Mobile phone number is required.' };
  }
  const clean = phone.toString().replace(/\D/g, '');
  const tenDigit = clean.slice(-10);
  if (tenDigit.length !== 10 || !/^[6-9]\d{9}$/.test(tenDigit)) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }
  return { valid: true, phone: tenDigit };
};

/**
 * Numeric Price Validator
 */
export const validatePrice = (price, fieldName = 'Price') => {
  if (price === undefined || price === null || price.toString().trim() === '') {
    return { valid: false, error: `${fieldName} is required.` };
  }
  const num = Number(price);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number greater than ₹0.` };
  }
  return { valid: true, value: num };
};

/**
 * Quantity Validator
 */
export const validateQuantity = (qty, fieldName = 'Quantity') => {
  if (qty === undefined || qty === null || qty.toString().trim() === '') {
    return { valid: false, error: `${fieldName} is required.` };
  }
  const num = Number(qty);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be greater than 0.` };
  }
  return { valid: true, value: num };
};

/**
 * 4-digit Security PIN Validator
 */
export const validatePin = (pin) => {
  if (!pin || !/^\d{4}$/.test(pin.toString().trim())) {
    return { valid: false, error: 'Security PIN must be exactly 4 numeric digits (0-9).' };
  }
  return { valid: true, pin: pin.toString().trim() };
};
