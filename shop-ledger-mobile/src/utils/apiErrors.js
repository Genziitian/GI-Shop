export const redactErrorText = (value = '') => String(value)
  .replace(/https?:\/\/[^\s<>"']+/gi, safeRequestUrl)
  .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted token]')
  .replace(/((?:password|authorization|access_token|refresh_token|id_token|token|api[_-]?key|secret)["']?\s*[:=]\s*)(["'])(.*?)\2/gi, '$1"[redacted]"')
  .replace(/((?:password|authorization|access_token|refresh_token|id_token|token|api[_-]?key|secret)["']?\s*[:=]\s*)[^\s"',;}]+/gi, '$1[redacted]')
  .slice(0, 800);

export const safeRequestUrl = (url = '') => String(url).split(/[?#]/)[0]
  .replace(/(https?:\/\/)[^/@]+@/i, '$1')
  .replace(/\/(?:%2b|\+)?\d{7,}(?=\/|$)/gi, '/[redacted]')
  .replace(/\/[^/]*(?:@|%40)[^/]*/gi, '/[redacted]');

export const createApiError = ({ status = 0, method = 'GET', url, serverMessage = '', kind,
  elapsedMs, hasSession, requestId, contentType } = {}) => {
  const detail = redactErrorText(serverMessage);
  let title = 'Request failed';
  let message = detail || 'The request could not be completed. Open Error details for more information.';
  let type = 'request';
  let code = status ? `HTTP_${status}` : 'REQUEST_FAILED';

  if (kind === 'timeout' || status === 408 || status === 504) {
    title = 'Request timed out'; type = 'timeout'; code = status ? `HTTP_${status}` : 'REQUEST_TIMEOUT';
    message = 'The server did not respond in time. Retry in a moment. This does not necessarily mean your internet is disconnected.';
  } else if (kind === 'network') {
    title = 'Cannot reach the server'; type = 'network'; code = 'NETWORK_ERROR';
    message = 'The phone could not complete a connection to the server. Check mobile data/Wi-Fi, VPN, and the server address. Android did not provide an HTTP response.';
  } else if (status === 401) {
    title = /\/api\/(login|auth\/google)$/.test(safeRequestUrl(url)) ? 'Sign-in failed' : 'Sign in again';
    type = 'auth';
    message = title === 'Sign-in failed' ? (detail || 'The server rejected these sign-in details.')
      : 'Your session is missing, expired, or no longer accepted by the server. Sign out and sign in again.';
  } else if (status === 403) {
    type = 'forbidden';
    title = /no shop context|not associated with a shop/i.test(detail) ? 'Shop account not linked' : 'Access denied';
    message = title === 'Shop account not linked'
      ? 'The server could not link this session to an active shop. Sign in with the correct shop account or contact support.'
      : (detail || 'The server rejected access to this resource. Check your account role and shop status.');
  } else if (status === 404) {
    title = 'Resource or API not found';
    message = detail || 'The server could not find this resource or API route. Check the server address and app version.';
  } else if (status === 429) {
    title = 'Too many requests'; type = 'rate_limit';
    message = 'The server is limiting requests. Wait a moment before retrying.';
  } else if (status >= 500) {
    title = status === 503 ? 'Server temporarily unavailable' : 'Server error'; type = 'server';
    message = 'The server could not complete this request. Your error details include its response for troubleshooting.';
  } else if (status === 400 || status === 422) {
    title = 'Check the information'; type = 'validation';
  } else if (status === 409) {
    title = 'Conflicting information'; type = 'validation';
  } else if (kind === 'response') {
    title = 'Unexpected server response'; type = 'response'; code = 'INVALID_RESPONSE';
    message = 'The server responded, but did not return the data the app expected. Open Error details to see which request failed.';
  }

  const error = new Error(message);
  Object.assign(error, { isApiError: true, title, type, code, status, diagnostics: {
    time: new Date().toISOString(), method: String(method).toUpperCase(),
    url: safeRequestUrl(url), status, code, type, serverMessage: detail,
    elapsedMs, hasSession: typeof hasSession === 'boolean' ? hasSession : undefined,
    requestId: redactErrorText(requestId || ''), contentType: redactErrorText(contentType || ''),
  } });
  return error;
};

export const formatApiErrorReport = (error, { context = '', app = '', platform = '' } = {}) => {
  const d = error?.diagnostics || {};
  return [
    'GI SHOP error report', context && `Screen: ${context}`, app && `App: ${app}`,
    platform && `Device: ${platform}`, `Time: ${d.time || new Date().toISOString()}`,
    `Error: ${error?.code || 'UNEXPECTED_ERROR'}`, `Category: ${error?.type || 'unknown'}`,
    `Message: ${redactErrorText(error?.message || error || 'Unknown error')}`,
    d.method && `Request: ${d.method} ${safeRequestUrl(d.url)}`,
    `HTTP status: ${d.status || 'No HTTP response'}`,
    typeof d.hasSession === 'boolean' && `Session attached: ${d.hasSession ? 'yes' : 'no'}`,
    Number.isFinite(d.elapsedMs) && `Duration: ${d.elapsedMs} ms`,
    d.serverMessage && `Server/device detail: ${redactErrorText(d.serverMessage)}`,
    d.contentType && `Response type: ${d.contentType}`, d.requestId && `Request ID: ${d.requestId}`,
  ].filter(value => value !== false && value !== undefined && value !== '').join('\n');
};
