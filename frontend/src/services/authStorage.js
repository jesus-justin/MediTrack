const AUTH_KEYS = ['token', 'username', 'role'];

export function getAuthValue(key) {
  return sessionStorage.getItem(key);
}

export function setAuthSession({ token, username, role }) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('username', username);
  sessionStorage.setItem('role', role);

  // Remove legacy shared storage values so tabs do not overwrite each other.
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function clearAuthSession() {
  AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

export function hasAuthSession() {
  return Boolean(getAuthValue('token'));
}