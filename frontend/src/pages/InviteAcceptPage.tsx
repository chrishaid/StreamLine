import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, LogIn } from 'lucide-react';
import { organizationApi } from '../services/api';
import { supabase } from '../lib/supabase';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-authenticated'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      acceptInvitation();
    }
  }, [token]);

  const acceptInvitation = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus('not-authenticated');
        setMessage('Please sign in to accept your invitation.');
        return;
      }

      // Accept the invitation
      await organizationApi.acceptInvitation(token!);
      setStatus('success');
      setMessage('You have successfully joined the organization!');

      // Redirect to the organization after a short delay
      setTimeout(() => {
        navigate('/organizations');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setStatus('error');

      // Parse error message
      if (err.message?.includes('not found') || err.message?.includes('invalid')) {
        setMessage('This invitation link is invalid or has already been used.');
      } else if (err.message?.includes('expired')) {
        setMessage('This invitation has expired. Please ask for a new invitation.');
      } else if (err.message?.includes('email')) {
        setMessage('This invitation was sent to a different email address. Please sign in with the correct account.');
      } else {
        setMessage(err.message || 'Failed to accept invitation. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent/10 to-accent/20 rounded-2xl mb-4">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">StreamLine</h1>
            <p className="text-sm text-slate-500">Organization Invitation</p>
          </div>

          {/* Status */}
          <div className="py-8">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
                <p className="text-slate-600">Accepting your invitation...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome!</h2>
                  <p className="text-slate-600">{message}</p>
                  <p className="text-sm text-slate-500 mt-2">Redirecting you to your organizations...</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Accept</h2>
                  <p className="text-slate-600">{message}</p>
                </div>
                <Link
                  to="/"
                  className="mt-4 px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                >
                  Go to Home
                </Link>
              </div>
            )}

            {status === 'not-authenticated' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <LogIn className="w-10 h-10 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign In Required</h2>
                  <p className="text-slate-600">{message}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    After signing in, you'll be redirected back to accept the invitation.
                  </p>
                </div>
                <Link
                  to={`/login?redirect=/invite/${token}`}
                  className="mt-4 px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
