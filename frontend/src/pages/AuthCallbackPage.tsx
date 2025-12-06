import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          navigate('/login?error=' + encodeURIComponent(errorDescription || errorParam));
          return;
        }

        // Check for authorization code (PKCE flow)
        const code = searchParams.get('code');

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => {
              navigate('/login?error=' + encodeURIComponent(exchangeError.message));
            }, 2000);
            return;
          }

          if (data.session) {
            // Successfully authenticated
            navigate('/');
            return;
          }
        }

        // If no code, check if we already have a session (hash fragment flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => {
            navigate('/login?error=' + encodeURIComponent(sessionError.message));
          }, 2000);
          return;
        }

        if (session) {
          navigate('/');
        } else {
          // No session and no code - something went wrong
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/login?error=no_session');
          }, 2000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred');
        setTimeout(() => {
          navigate('/login?error=callback_error');
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-gray-600">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
            <p className="text-gray-600">Please wait while we set up your account</p>
          </>
        )}
      </div>
    </div>
  );
}
