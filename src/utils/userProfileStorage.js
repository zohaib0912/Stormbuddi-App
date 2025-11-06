import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@user_profile';

export const getUserProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

export const setUserProfile = async (profile) => {
  try {
    const merged = { name: '', avatarUrl: '', ...profile };
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch (_) {}
};

export const updateUserProfile = async (partialProfile) => {
  try {
    const current = (await getUserProfile()) || {};
    const next = { ...current, ...partialProfile };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (_) {}
};

export const clearUserProfile = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (_) {}
};

export default { getUserProfile, setUserProfile, updateUserProfile, clearUserProfile };


