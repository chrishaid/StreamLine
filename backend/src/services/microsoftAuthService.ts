import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { User, userStore } from '../models/userModel';

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  },
};

let msalClient: ConfidentialClientApplication | null = null;

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  msalClient = new ConfidentialClientApplication(msalConfig);
}

export async function getMicrosoftAuthUrl(redirectUri: string): Promise<string> {
  if (!msalClient) {
    throw new Error('Microsoft authentication is not configured');
  }

  const authCodeUrlParameters = {
    scopes: ['user.read', 'email', 'profile', 'openid'],
    redirectUri,
  };

  const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  return response;
}

export async function handleMicrosoftCallback(
  code: string,
  redirectUri: string
): Promise<User> {
  if (!msalClient) {
    throw new Error('Microsoft authentication is not configured');
  }

  const tokenRequest = {
    code,
    scopes: ['user.read', 'email', 'profile', 'openid'],
    redirectUri,
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);

  if (!response?.account) {
    throw new Error('Failed to authenticate with Microsoft');
  }

  const { account } = response;
  const email = account.username;
  const providerId = account.homeAccountId;

  // Check if user exists
  let user = userStore.findByProviderId('microsoft', providerId);

  if (!user) {
    // Check if user with same email exists
    user = userStore.findByEmail(email);

    if (!user) {
      // Create new user
      user = userStore.create({
        email,
        name: account.name || email,
        provider: 'microsoft',
        providerId,
        role: 'editor',
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

  return user;
}
