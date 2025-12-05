import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { authApi, getToken, clearToken } from '../../services/authApi';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthLoading, logout: logoutStore } = useAppStore();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        // Fetch current user with the token
        const user = await authApi.getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Token might be invalid, clear it
        clearToken();
        logoutStore();
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [setUser, setAuthLoading, logoutStore]);

  return <>{children}</>;
}
