'use client';

import { getMe, login as loginRequest } from './api';
import { User } from './types';

const TOKEN_KEY = 'az_support_panel_token';
const USER_KEY = 'az_support_panel_user';

const LEGACY_TOKEN_KEY = 'az_admin_token';
const LEGACY_USER_KEY = 'az_admin_user';

function isAllowedPanelRole(role?: string) {
  return ['admin', 'support'].includes(role || '');
}

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

function removeLocalStorage(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

function migrateLegacyStorage() {
  if (typeof window === 'undefined') return;

  const currentToken = localStorage.getItem(TOKEN_KEY);
  const currentUser = localStorage.getItem(USER_KEY);

  if (!currentToken) {
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      localStorage.setItem(TOKEN_KEY, legacyToken);
    }
  }

  if (!currentUser) {
    const legacyUser = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyUser) {
      localStorage.setItem(USER_KEY, legacyUser);
    }
  }
}

export function getStoredToken(): string | null {
  migrateLegacyStorage();
  return readLocalStorage(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  migrateLegacyStorage();

  const raw = readLocalStorage(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    removeLocalStorage(USER_KEY);
    removeLocalStorage(LEGACY_USER_KEY);
    return null;
  }
}

export function clearAuth() {
  removeLocalStorage(TOKEN_KEY);
  removeLocalStorage(USER_KEY);
  removeLocalStorage(LEGACY_TOKEN_KEY);
  removeLocalStorage(LEGACY_USER_KEY);
}

export async function performLogin(email: string, password: string) {
  const data = await loginRequest(email, password);

  if (!data?.token || !data?.user) {
    throw new Error('Ungültige Login-Antwort erhalten.');
  }

  if (!isAllowedPanelRole(data.user.role)) {
    throw new Error(
      'Dieser Zugang ist nicht für das Support Panel freigeschaltet.'
    );
  }

  writeLocalStorage(TOKEN_KEY, data.token);
  writeLocalStorage(USER_KEY, JSON.stringify(data.user));

  removeLocalStorage(LEGACY_TOKEN_KEY);
  removeLocalStorage(LEGACY_USER_KEY);

  return data;
}

export async function restoreSession(): Promise<{ token: string; user: User } | null> {
  const token = getStoredToken();
  const storedUser = getStoredUser();

  if (!token || !storedUser) return null;

  try {
    const user = await getMe(token);

    if (!isAllowedPanelRole(user.role)) {
      clearAuth();
      return null;
    }

    writeLocalStorage(USER_KEY, JSON.stringify(user));
    return { token, user };
  } catch {
    clearAuth();
    return null;
  }
}