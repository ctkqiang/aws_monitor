import 'react-native-get-random-values';

const ENC_PREFIX = 'ENC:';

function toBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    return str.split('').map((c) => {
      const code = c.charCodeAt(0).toString(2).padStart(16, '0');
      return (
        chars[parseInt(code.substring(0, 6), 2)] +
        chars[parseInt(code.substring(6, 12), 2)] +
        (code.length > 12 ? chars[parseInt(code.substring(12), 2)] + '=' : '==')
      );
    }).join('');
  }
}

function fromBase64(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return b64;
  }
}

function generateNonce(length: number = 16): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function xorEncode(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const nonce = generateNonce(16);
  const key = nonce + 'AWSight2024!@';
  const encrypted = xorEncode(plaintext, key);
  return ENC_PREFIX + nonce + ':' + toBase64(encrypted);
}

export function decryptSecret(encoded: string): string {
  if (!encoded || !encoded.startsWith(ENC_PREFIX)) {
    return encoded;
  }
  const payload = encoded.substring(ENC_PREFIX.length);
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) return '';
  const nonce = payload.substring(0, colonIdx);
  const encryptedB64 = payload.substring(colonIdx + 1);
  try {
    const encrypted = fromBase64(encryptedB64);
    const key = nonce + 'AWSight2024!@';
    return xorEncode(encrypted, key);
  } catch {
    return '';
  }
}
