import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Timeout for auth operations
const SESSION_TIMEOUT = 3000;
const PROFILE_TIMEOUT = 2000;
const MAX_AUTH_WAIT = 5000; // Hard limit - force complete after this

// Helper to get user profile from session data (no DB call)
function getUserFromSession(authUser: User) {
  return {
    id: authUser.id,
    email: authUser.email!,
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email!,
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
    role: 'editor' as const,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthLoading, logout: logoutStore } = useAppStore();

  useEffect(() => {
    let mounted = true;
    let authCompleted = false;
    console.log('[Auth] Initializing...');

    // Safety net: Force complete auth loading after MAX_AUTH_WAIT
    const forceCompleteTimeout = setTimeout(() => {
      if (!authCompleted && mounted) {
        console.warn('[Auth] Force completing auth after timeout');
        setAuthLoading(false);
        authCompleted = true;
      }
    }, MAX_AUTH_WAIT);

    const completeAuth = (user: any) => {
      if (authCompleted || !mounted) return;
      authCompleted = true;
      clearTimeout(forceCompleteTimeout);
      setUser(user);
      setAuthLoading(false);
      console.log('[Auth] Complete:', user ? user.email : 'no user');
    };

    // Get initial session with timeout
    const initAuth = async () => {
      try {
        // Create a race between getSession and a timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), SESSION_TIMEOUT)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (!mounted) return;

        // Timeout occurred
        if (result === null) {
          console.warn('[Auth] Session fetch timeout, checking localStorage...');
          // Try to get session from localStorage directly
          const storedSession = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
          if (storedSession) {
            try {
              const parsed = JSON.parse(storedSession);
              if (parsed?.user) {
                console.log('[Auth] Found cached user in localStorage');
                completeAuth(getUserFromSession(parsed.user));
                return;
              }
            } catch (e) {
              console.warn('[Auth] Failed to parse stored session');
            }
          }
          completeAuth(null);
          return;
        }

        const { data: { session }, error: sessionError } = result;

        if (sessionError) {
          console.warn('[Auth] Session error:', sessionError.message);
          completeAuth(null);
          return;
        }

        if (!session?.user) {
          console.log('[Auth] No session found');
          completeAuth(null);
          return;
        }

        console.log('[Auth] Session found for:', session.user.email);

        // Try to get profile with a short timeout, but don't block on it
        try {
          const profilePromise = supabase
            .from('users')
            .select('id, name, avatar_url, role')
            .eq('id', session.user.id)
            .single();

          const profileTimeout = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), PROFILE_TIMEOUT)
          );

          const profileResult = await Promise.race([profilePromise, profileTimeout]);

          if (!mounted) return;

          if (profileResult === null || profileResult.error) {
            // Profile fetch failed or timed out - use session data
            console.log('[Auth] Using session data for profile');
            completeAuth(getUserFromSession(session.user));

            // Try to create profile in background if it doesn't exist
            if (profileResult?.error?.code === 'PGRST116') {
              supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || session.user.email!,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                role: 'editor',
                last_login_at: new Date().toISOString(),
              }).then(() => console.log('[Auth] Profile created in background'));
            }
          } else {
            // Got profile from database
            completeAuth({
              id: session.user.id,
              email: session.user.email!,
              name: profileResult.data.name || session.user.user_metadata?.full_name || session.user.email!,
              avatarUrl: profileResult.data.avatar_url || session.user.user_metadata?.avatar_url,
              role: profileResult.data.role || 'editor',
            });
          }
        } catch (err) {
          console.warn('[Auth] Profile fetch error:', err);
          completeAuth(getUserFromSession(session.user));
        }
      } catch (error: any) {
        console.error('[Auth] Init error:', error.message);
        if (mounted) {
          completeAuth(null);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event);
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const user = getUserFromSession(session.user);
        setUser(user);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        logoutStore();
        setAuthLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed');
      }
    });

    return () => {
      mounted = false;
      clearTimeout(forceCompleteTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading, logoutStore]);

  return <>{children}</>;
}
