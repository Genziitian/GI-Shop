/**
 * Categorizes and formats errors into user-friendly, descriptive messages
 * with appropriate titles, explanations, and actionable guidance for Web.
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
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('Network request failed') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('Unable to connect') ||
    rawMessage.includes('HTML instead of JSON') ||
    rawMessage.includes('ECONNREFUSED')
  ) {
    return {
      title: 'Connection Error',
      message: 'Unable to reach the server. Please verify your internet connection or check if the backend server is running.',
      type: 'network',
    };
  }

  if (rawMessage.includes('timeout') || rawMessage.includes('timed out')) {
    return {
      title: 'Request Timeout',
      message: 'The server took too long to respond. Please check your connection and retry.',
      type: 'network',
    };
  }

  // 2. Authentication & Authorization Errors
  if (status === 401 || rawMessage.includes('Token missing') || rawMessage.includes('Invalid or expired token') || rawMessage.includes('Unauthorized')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again to continue.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('Incorrect password') || rawMessage.includes('Invalid credentials')) {
    return {
      title: 'Invalid Credentials',
      message: 'Incorrect email/ID or password. Please verify your details and try again.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('User not found') || rawMessage.includes('No active customer found')) {
    return {
      title: 'Account Not Found',
      message: 'No registered user found with these details. Please verify your Short ID or Email.',
      type: 'auth',
    };
  }

  if (rawMessage.includes('deactivated') || rawMessage.includes('terminated')) {
    return {
      title: 'Account Deactivated',
      message: 'This account or store has been deactivated by the administrator. Please contact support.',
      type: 'forbidden',
    };
  }

  if (status === 403 || rawMessage.includes('Forbidden') || rawMessage.includes('Only shop owner')) {
    return {
      title: 'Access Restricted',
      message: 'You do not have permission to perform this action.',
      type: 'forbidden',
    };
  }

  // 3. Validation & Conflict Errors
  if (rawMessage.includes('already registered') || rawMessage.includes('already in use') || rawMessage.includes('already exists')) {
    return {
      title: 'Already Registered',
      message: 'An account with this phone number or email is already registered. Please log in instead.',
      type: 'validation',
    };
  }

  if (rawMessage.includes('10-digit') || (rawMessage.includes('phone') && rawMessage.includes('valid'))) {
    return {
      title: 'Invalid Phone Number',
      message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).',
      type: 'validation',
    };
  }

  if (rawMessage.includes('PIN must be') || rawMessage.includes('Current PIN is incorrect')) {
    return {
      title: 'PIN Error',
      message: rawMessage || 'Security PIN must be exactly 4 numeric digits.',
      type: 'validation',
    };
  }

  // 4. Business Logic
  if (rawMessage.includes('Shop closed') || rawMessage.includes('shop is currently closed')) {
    return {
      title: 'Shop Closed',
      message: 'This store is currently closed and cannot take orders right now.',
      type: 'business',
    };
  }

  if (rawMessage.includes('Add to Book') || rawMessage.includes('Khata')) {
    return {
      title: 'Khata Credit Error',
      message: rawMessage || 'A registered customer is required to record credit billing.',
      type: 'business',
    };
  }

  // 5. Server Errors (5xx)
  if (status >= 500 || rawMessage.includes('Internal Server Error') || rawMessage.includes('Database error')) {
    return {
      title: 'Server Error',
      message: 'Our systems encountered an unexpected error. Please try again shortly.',
      type: 'server',
    };
  }

  return {
    title: 'Notice',
    message: rawMessage || fallbackMessage,
    type: 'unknown',
  };
};

/**
 * Clean alert for web with formatted title and message
 */
export const notifyError = (error, defaultTitle = 'Notice', defaultMessage = 'An error occurred.') => {
  const parsed = parseError(error, defaultMessage);
  alert(`${parsed.title}:\n${parsed.message}`);
};

/**
 * Phone Number Validator
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.toString().trim()) {
    return { valid: false, error: 'Mobile phone number is required.' };
  }
  const clean = phone.toString().replace(/\D/g, '').slice(-10);
  if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' };
  }
  return { valid: true, phone: clean };
};

/**
 * Price Validator
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
