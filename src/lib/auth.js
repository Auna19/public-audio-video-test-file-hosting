import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'auth_session_token';
const AUTH_SECRET = process.env.ADMIN_SECRET || 'platform_admin_session_hmac_secret_key_987654321';

export function signToken(username) {
  const payload = JSON.stringify({
    user: username,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;

  const [encodedPayload, signature] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return {
      username: payload.user,
      user: payload.user,
      role: payload.role || 'admin',
    };
  } catch {
    return null;
  }
}

export function validateCredentials(user, pass) {
  const expectedUser = process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME.trim() : '';
  const expectedPass = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : '';

  // If no credentials configured in environment variables, deny access by default
  if (!expectedUser || !expectedPass) {
    return false;
  }

  // Constant-time length and byte comparison to prevent timing attacks
  const uBuf = Buffer.from(String(user));
  const euBuf = Buffer.from(String(expectedUser));
  const pBuf = Buffer.from(String(pass));
  const epBuf = Buffer.from(String(expectedPass));

  if (uBuf.length !== euBuf.length || pBuf.length !== epBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(uBuf, euBuf) && crypto.timingSafeEqual(pBuf, epBuf);
}

export async function getAuthenticatedAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { SESSION_COOKIE_NAME };
