import apiClient from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider?: 'google' | 'microsoft';
  role: 'viewer' | 'editor' | 'admin';
  preferences?: {
    defaultView: string;
    autoSaveInterval: number;
    theme: 'light' | 'dark';
    chatPosition: 'right' | 'left' | 'bottom';
  };
}

export const authApi = {
  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};

// OAuth helpers
export function getGoogleAuthUrl(): string {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${API_URL}/auth/google`;
}

export function getMicrosoftAuthUrl(): string {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${API_URL}/auth/microsoft`;
}

// Token management
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}
