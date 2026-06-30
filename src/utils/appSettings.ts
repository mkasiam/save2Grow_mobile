import { localStorageService } from './storage';

export type AppLanguage = 'en' | 'bn';

const APP_SETTINGS_STORAGE_KEY = 'app-settings';

const DEFAULT_APP_SETTINGS = {
  language: 'en' as AppLanguage,
  reminderFrequency: 'weekly',
  remindersEnabled: true,
  reminderTime: '8:00 PM',
};

export const getStoredAppSettings = async () => {
  try {
    const value = await localStorageService.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!value) {
      return DEFAULT_APP_SETTINGS;
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      ...JSON.parse(value),
    };
  } catch (error) {
    console.error('Error loading app settings:', error);
    return DEFAULT_APP_SETTINGS;
  }
};

export const updateStoredAppSettings = async (updates) => {
  const current = await getStoredAppSettings();
  const next = {
    ...current,
    ...updates,
  };
  await localStorageService.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
};
