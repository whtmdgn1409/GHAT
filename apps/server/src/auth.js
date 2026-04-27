import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ghat-dev-secret';
const ACCESS_EXPIRES_SEC = 60 * 30;
const REFRESH_EXPIRES_SEC = 60 * 60 * 24 * 7;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const target = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== target.length) return false;
  return timingSafeEqual(candidate, target);
}

export function createJWT(payload, expiresInSec = ACCESS_EXPIRES_SEC, secret = JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: nowSec, exp: nowSec + expiresInSec };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token, secret = JWT_SECRET) {
  if (!token || token.split('.').length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  const expected = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueAuthTokens(userId) {
  return {
    accessToken: createJWT({ sub: userId, scope: 'access' }, ACCESS_EXPIRES_SEC),
    refreshToken: createJWT({ sub: userId, scope: 'refresh' }, REFRESH_EXPIRES_SEC),
    tokenType: 'Bearer',
    expiresInSec: ACCESS_EXPIRES_SEC
  };
}

export function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}
