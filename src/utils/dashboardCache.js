import AsyncStorage from '@react-native-async-storage/async-storage';

/** Must match key removed in `clearAuthData` (see tokenStorage). */
export const DASHBOARD_CACHE_STORAGE_KEY = 'mobile_dashboard_cache_v1';

/**
 * Stable key for the signed-in user so cache does not leak across accounts.
 */
export function resolveDashboardUserKey(user, token) {
  if (user && typeof user === 'object') {
    const id = user.id ?? user.user_id ?? user.userId;
    if (id != null && String(id).trim() !== '') {
      return `id:${String(id)}`;
    }
    if (user.email) {
      return `email:${String(user.email).toLowerCase().trim()}`;
    }
  }
  if (token && typeof token === 'string' && token.length > 16) {
    return `tok:${token.slice(0, 8)}${token.slice(-8)}`;
  }
  return token ? `tok:${String(token.length)}` : '';
}

export function isValidCachedDashboardPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const { metrics, stormAlerts, leads } = payload;
  return (
    Array.isArray(metrics) &&
    metrics.length > 0 &&
    Array.isArray(stormAlerts) &&
    Array.isArray(leads)
  );
}

export async function readDashboardCache() {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.userKey) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDashboardCache({ userKey, payload }) {
  if (!userKey || !isValidCachedDashboardPayload(payload)) {
    return;
  }
  try {
    const entry = {
      userKey,
      savedAt: Date.now(),
      payload,
    };
    await AsyncStorage.setItem(DASHBOARD_CACHE_STORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn('Dashboard cache write failed:', error?.message || error);
  }
}

export async function clearDashboardCache() {
  try {
    await AsyncStorage.removeItem(DASHBOARD_CACHE_STORAGE_KEY);
  } catch (error) {
    console.warn('Dashboard cache clear failed:', error?.message || error);
  }
}
