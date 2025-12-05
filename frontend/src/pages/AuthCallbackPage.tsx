import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { setToken } from '../services/authApi';
import { Loader2 } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAppStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Auth error:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (!token) {
        navigate('/login?error=no_token');
        return;
      }

      // Store token
      setToken(token);

      // Token will be used by the AuthProvider to fetch user data
      // For now, just redirect to home
      navigate('/');
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we set up your account</p>
      </div>
    </div>
  );
}
