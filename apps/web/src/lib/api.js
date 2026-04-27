import { clearAuthSession, loadAuthSession, saveAuthSession } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}, retry = true) {
  const session = loadAuthSession();
  const headers = {
    'content-type': 'application/json',
    ...(options.headers || {})
  };

  if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && retry && session?.refreshToken) {
    const refreshed = await refreshToken(session.refreshToken);
    if (refreshed?.accessToken) {
      saveAuthSession({ ...session, ...refreshed });
      return request(path, options, false);
    }
    clearAuthSession();
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const message = body?.error?.message || '요청 처리 중 오류가 발생했습니다.';
    throw new Error(message);
  }

  return body.data;
}

export async function signup(payload) {
  return request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function login(payload) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function refreshToken(refreshTokenValue) {
  return request(
    '/api/v1/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    },
    false
  );
}

export async function createRoom(payload) {
  return request('/api/v1/rooms', { method: 'POST', body: JSON.stringify(payload) });
}

export async function joinRoom(roomId) {
  return request(`/api/v1/rooms/${roomId}/join`, { method: 'POST' });
}

export async function leaveRoom(roomId) {
  return request(`/api/v1/rooms/${roomId}/leave`, { method: 'POST' });
}

export async function createGame(roomId, payload) {
  return request(`/api/v1/rooms/${roomId}/games`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function startGame(gameId) {
  return request(`/api/v1/games/${gameId}/start`, { method: 'POST' });
}

export async function guessWord(gameId, guess) {
  return request(`/api/v1/games/${gameId}/guess`, { method: 'POST', body: JSON.stringify({ guess }) });
}

export async function requestHint(gameId) {
  return request(`/api/v1/games/${gameId}/hint`, { method: 'POST' });
}

export async function finishGame(gameId) {
  return request(`/api/v1/games/${gameId}/finish`, { method: 'POST' });
}

export async function fetchRoomState(roomId) {
  return request(`/api/v1/rooms/${roomId}/state`);
}

export function createRealtimeSocket() {
  const wsBase = API_BASE.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/ws`);
}
