import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, userStore } from '../models/userModel';

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = userStore.findByProviderId('google', profile.id);

          if (!user) {
            // Check if user with same email exists
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = userStore.findByEmail(email);
            }

            if (!user && email) {
              // Create new user
              user = userStore.create({
                email,
                name: profile.displayName || profile.emails?.[0]?.value || 'Unknown User',
                avatarUrl: profile.photos?.[0]?.value,
                provider: 'google',
                providerId: profile.id,
                role: 'editor', // Default role
                preferences: {
                  defaultView: 'browse',
                  autoSaveInterval: 30,
                  theme: 'light',
                  chatPosition: 'right',
                },
              });
            }
          } else {
            // Update last login
            userStore.updateLastLogin(user.id);
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;
