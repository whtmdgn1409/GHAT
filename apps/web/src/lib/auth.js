const AUTH_KEY = 'ghat_auth_user';

export function saveAuthUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function loadAuthUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}
