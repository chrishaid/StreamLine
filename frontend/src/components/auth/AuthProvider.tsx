import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthLoading, logout: logoutStore } = useAppStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile from public.users table
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: userProfile, error }) => {
            if (error) {
              console.error('Failed to fetch user profile:', error);
              setAuthLoading(false);
              return;
            }

            // Combine auth user with profile data
            const user = {
              id: session.user.id,
              email: session.user.email!,
              name: userProfile?.name || session.user.email!,
              avatarUrl: userProfile?.avatar_url || session.user.user_metadata?.avatar_url,
              role: userProfile?.role || 'editor',
            };

            setUser(user);
            setAuthLoading(false);
          });
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user = {
          id: session.user.id,
          email: session.user.email!,
          name: userProfile?.name || session.user.email!,
          avatarUrl: userProfile?.avatar_url || session.user.user_metadata?.avatar_url,
          role: userProfile?.role || 'editor',
        };

        setUser(user);
      } else if (event === 'SIGNED_OUT') {
        logoutStore();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading, logoutStore]);

  return <>{children}</>;
}
