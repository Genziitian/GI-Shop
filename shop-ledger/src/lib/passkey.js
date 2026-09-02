import { request } from './api';

// Check if browser/hardware supports WebAuthn Passkeys
export const isPasskeySupported = async () => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    } catch {
      return false;
    }
  }
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

// Register a new Passkey (for currently logged-in user)
export const registerPasskey = async (deviceLabel = 'My Device Passkey') => {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys (WebAuthn) are not supported in this browser.');
  }

  // 1. Get challenge from backend
  const options = await request('/passkey/register-challenge', { method: 'POST' });

  // 2. Format options for WebAuthn API
  const publicKeyCredentialCreationOptions = {
    challenge: base64URLToBuffer(options.challenge),
    rp: {
      name: options.rp.name,
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
    },
    user: {
      id: base64URLToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection,
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

// Sign in with Passkey (public login)
export const loginWithPasskey = async () => {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys (WebAuthn) are not supported in this browser.');
  }

  // 1. Get challenge from backend
  const options = await request('/passkey/auth-challenge', { method: 'POST' });

  // 2. Format options for WebAuthn get
  const publicKeyCredentialRequestOptions = {
    challenge: base64URLToBuffer(options.challenge),
    timeout: options.timeout || 60000,
    userVerification: options.userVerification || 'preferred',
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
  };

  // 3. Trigger browser native Face ID / Fingerprint / Device PIN prompt
  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });

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
