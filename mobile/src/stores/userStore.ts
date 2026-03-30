import { create } from 'zustand';
import { UserSettings } from '@/types';
import * as SecureStore from 'expo-secure-store';

interface UserState {
  settings: UserSettings;
  isLoading: boolean;
  
  // 设置操作
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  isDarkMode: false,
  currency: 'CNY',
  language: 'zh-CN',
  enableNotifications: true,
  enableVoiceInput: true,
  enableCameraInput: true,
  biometricEnabled: false,
  cloudSyncEnabled: false
};

export const useUserStore = create<UserState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  
  // 更新设置
  updateSettings: async (updates) => {
    const { settings } = get();
    const newSettings = { ...settings, ...updates };
    
    // 保存到安全存储
    await SecureStore.setItemAsync('userSettings', JSON.stringify(newSettings));
    
    set({ settings: newSettings });
  },
  
  // 加载设置
  loadSettings: async () => {
    set({ isLoading: true });
    
    try {
      const stored = await SecureStore.getItemAsync('userSettings');
      if (stored) {
        const settings = JSON.parse(stored) as UserSettings;
        set({ settings, isLoading: false });
      } else {
        set({ settings: defaultSettings, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
      set({ settings: defaultSettings, isLoading: false });
    }
  },
  
  // 重置设置
  resetSettings: () => {
    set({ settings: defaultSettings });
    SecureStore.deleteItemAsync('userSettings');
  }
}));
