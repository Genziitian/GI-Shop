import { request } from './api';

// Check if browser/hardware supports WebAuthn Passkeys
export const isPasskeySupported = async () => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  return true;
};

// Helper: ArrayBuffer to Base64URL
export function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper: Base64URL to ArrayBuffer
export function base64URLToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

// Register a new Passkey (Standard WebAuthn create)
export const registerPasskey = async (deviceLabel = 'Device Passkey') => {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys are not supported on this browser or device.');
  }

  // 1. Get challenge from backend
  const options = await request('/passkey/register-challenge', { method: 'POST' });

  // 2. Format options for WebAuthn API
  const publicKeyCredentialCreationOptions = {
    challenge: base64URLToBuffer(options.challenge),
    rp: {
      name: options.rp?.name || 'GI SHOP',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
    },
    user: {
      id: base64URLToBuffer(options.user.id),
      name: options.user.name || 'user@gishop',
      displayName: options.user.displayName || 'GI SHOP User'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred'
    },
    timeout: options.timeout || 60000,
    attestation: 'none'
  };

  // 3. Trigger browser native biometric prompt
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  if (!credential) {
    throw new Error('Failed to create Passkey credential.');
  }

  const credentialId = bufferToBase64URL(credential.rawId);
  const rawPublicKey = credential.response.getPublicKey 
    ? bufferToBase64URL(credential.response.getPublicKey())
    : bufferToBase64URL(credential.response.attestationObject);

  // 4. Send credential to backend to store
  const res = await request('/passkey/register-verify', {
    method: 'POST',
    body: JSON.stringify({
      credentialId,
      publicKey: rawPublicKey,
      deviceLabel
    })
  });

  return res;
};

// Sign in with Passkey (Standard WebAuthn get)
export const loginWithPasskey = async (isConditional = false, signal = null) => {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys are not supported on this browser or device.');
  }

  // 1. Get challenge from backend
  const options = await request('/passkey/auth-challenge', { method: 'POST' });

  // 2. Format options for WebAuthn get
  const publicKeyCredentialRequestOptions = {
    challenge: base64URLToBuffer(options.challenge),
    timeout: options.timeout || 60000,
    userVerification: 'preferred',
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
  };

  const getOptions = {
    publicKey: publicKeyCredentialRequestOptions
  };

  if (isConditional) {
    getOptions.mediation = 'conditional';
  }
  if (signal) {
    getOptions.signal = signal;
  }

  // 3. Trigger browser native Face ID / Fingerprint / Device PIN prompt
  const assertion = await navigator.credentials.get(getOptions);

  if (!assertion) {
    throw new Error('Passkey authentication was cancelled.');
  }

  const credentialId = bufferToBase64URL(assertion.rawId);

  // 4. Verify with backend and receive login JWT token
  const res = await request('/passkey/auth-verify', {
    method: 'POST',
    body: JSON.stringify({
      credentialId
    })
  });

  return res;
};
