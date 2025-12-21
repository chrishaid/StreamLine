import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { Sparkles, PenTool, BarChart3 } from 'lucide-react';
import { RangeLogo } from '../components/brand/RangeLogo';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppStore();

  // Get redirect parameter from URL
  const redirectTo = searchParams.get('redirect');

  useEffect(() => {
    if (isAuthenticated) {
      // If there's a pending redirect, go there instead
      const pendingRedirect = sessionStorage.getItem('auth_redirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('auth_redirect');
        navigate(pendingRedirect);
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    // Store redirect URL before OAuth
    if (redirectTo) {
      sessionStorage.setItem('auth_redirect', redirectTo);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google login error:', error);
    }
  };

  const handleMicrosoftLogin = async () => {
    // Store redirect URL before OAuth
    if (redirectTo) {
      sessionStorage.setItem('auth_redirect', redirectTo);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Microsoft login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist">
      <div className="max-w-sm w-full mx-4">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-forest rounded-2xl mb-4 shadow-soft">
            <RangeLogo size={36} variant="mark" light={true} />
          </div>
          <h1 className="text-3xl font-serif italic text-forest tracking-tight">Range</h1>
          <p className="text-sm text-slate-500 mt-1">Process Design Hub</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-soft p-8 border border-mist-300">
          <h2 className="text-lg font-semibold text-forest mb-1">Welcome</h2>
          <p className="text-sm text-slate-500 mb-6">
            Sign in to manage your processes
          </p>

          <div className="space-y-3">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-mist-300 rounded-lg hover:bg-mist/50 hover:border-sage/30 transition-all text-sm font-medium text-forest"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Microsoft Login */}
            <button
              onClick={handleMicrosoftLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-mist-300 rounded-lg hover:bg-mist/50 hover:border-sage/30 transition-all text-sm font-medium text-forest"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-stone">
            By signing in, you agree to our Terms of Service
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-soft mb-2 border border-mist-300">
              <Sparkles className="w-5 h-5 text-sage" />
            </div>
            <p className="text-xs text-forest font-medium">AI-Powered</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-soft mb-2 border border-mist-300">
              <PenTool className="w-5 h-5 text-pine" />
            </div>
            <p className="text-xs text-forest font-medium">Visual Editor</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-soft mb-2 border border-mist-300">
              <BarChart3 className="w-5 h-5 text-analytics-500" />
            </div>
            <p className="text-xs text-forest font-medium">Analytics</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-stone font-mono">arran.ge</p>
        </div>
      </div>
    </div>
  );
}
