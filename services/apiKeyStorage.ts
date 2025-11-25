// API Key storage management using localStorage

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const saveApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save API key:', error);
    throw new Error('로컬 스토리지에 API 키를 저장할 수 없습니다.');
  }
};

export const getApiKey = (): string | null => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    return null;
  }
};

export const removeApiKey = (): void => {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove API key:', error);
  }
};

export const hasApiKey = (): boolean => {
  const key = getApiKey();
  return key !== null && key.trim() !== '';
};
