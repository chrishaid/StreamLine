# StreamLine Migration Guide: Supabase + Vercel

This guide walks you through migrating StreamLine from a local backend to Supabase, and deploying to Vercel.

## 📋 Prerequisites

- [ ] Supabase account ([supabase.com](https://supabase.com))
- [ ] Vercel account ([vercel.com](https://vercel.com))
- [ ] Google Cloud Console project (for Google OAuth)
- [ ] Azure Portal app registration (for Microsoft OAuth)

---

## 🗄️ Part 1: Supabase Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com/) → **New Project**
2. Fill in details:
   - **Name**: StreamLine
   - **Database Password**: [Generate & Save]
   - **Region**: [Choose closest]
3. Wait 2-3 minutes for provisioning

### Step 2: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy contents of `supabase_migration.sql` and paste
4. Click **Run**
5. Verify: Go to **Table Editor** → Confirm all tables exist

### Step 3: Get Supabase Credentials

Go to **Settings** → **API**:
- Copy **Project URL**: `https://xxxxx.supabase.co`
- Copy **anon public key**
- Save these for later!

---

## 🔐 Part 2: Configure Authentication

### Step 1: Enable Auth Providers in Supabase

Go to **Authentication** → **Providers**

#### Google OAuth:

1. Toggle **Google** to enabled
2. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
3. **IMPORTANT**: Copy the **Callback URL** shown (looks like `https://xxxxx.supabase.co/auth/v1/callback`)
4. Add this callback URL to Google Cloud Console:
   - Go to your OAuth app
   - Add to **Authorized redirect URIs**

#### Microsoft (Azure) OAuth:

1. Toggle **Azure** to enabled
2. Enter your Azure credentials:
   - **Client ID**: Your Application (client) ID
   - **Client Secret**: Your secret value
   - **Azure Tenant URL**: `https://login.microsoftonline.com/{your-tenant-id}/v2.0`
3. Copy the **Callback URL**
4. Add this to Azure Portal:
   - Your App Registration → **Redirect URIs**

### Step 2: Configure Site URLs

**Authentication** → **URL Configuration**:

For development:
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: `http://localhost:5173/**`

For production (add after deploying to Vercel):
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

---

## 💻 Part 3: Update Frontend Code

### Step 1: Configure Environment Variables

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 2: Update Authentication Flow

The Supabase client is already configured in `src/lib/supabase.ts`. Now you need to update your auth components:

**Key changes needed:**

1. **Update `src/components/auth/AuthProvider.tsx`**:
   ```typescript
   import { supabase } from '../../lib/supabase';

   // Replace custom auth with:
   const { data: { session } } = await supabase.auth.getSession();

   // For sign in:
   await supabase.auth.signInWithOAuth({
     provider: 'google', // or 'azure'
     options: {
       redirectTo: `${window.location.origin}/auth/callback`
     }
   });
   ```

2. **Update `src/pages/LoginPage.tsx`**:
   ```typescript
   const handleGoogleLogin = async () => {
     await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         redirectTo: `${window.location.origin}/auth/callback`
       }
     });
   };

   const handleMicrosoftLogin = async () => {
     await supabase.auth.signInWithOAuth({
       provider: 'azure',
       options: {
         redirectTo: `${window.location.origin}/auth/callback`
       }
     });
   };
   ```

3. **Update `src/pages/AuthCallbackPage.tsx`**:
   ```typescript
   import { supabase } from '../lib/supabase';
   import { useNavigate } from 'react-router-dom';
   import { useEffect } from 'react';

   export function AuthCallbackPage() {
     const navigate = useNavigate();

     useEffect(() => {
       supabase.auth.onAuthStateChange((event, session) => {
         if (session) {
           navigate('/');
         }
       });
     }, [navigate]);

     return <div>Loading...</div>;
   }
   ```

### Step 3: Update API Calls

Replace your current API service with Supabase queries:

**Example for processes:**

```typescript
import { supabase } from '../lib/supabase';

// Get all processes
export async function getAllProcesses() {
  const { data, error } = await supabase
    .from('processes')
    .select(`
      *,
      currentVersion:process_versions!current_version_id(*),
      primaryCategory:categories!primary_category_id(*),
      owner:users!owner_id(*)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Create process
export async function createProcess(process: {
  name: string;
  bpmnXml: string;
  description?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create process version first
  const { data: version, error: versionError } = await supabase
    .from('process_versions')
    .insert({
      version_number: '1.0',
      major_version: 1,
      minor_version: 0,
      bpmn_xml: process.bpmnXml,
      change_type: 'major',
      created_by: user.id,
      branch_name: 'main'
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Then create process
  const { data, error } = await supabase
    .from('processes')
    .insert({
      name: process.name,
      description: process.description,
      status: 'draft',
      owner_id: user.id,
      created_by: user.id,
      updated_by: user.id,
      primary_category_id: 'category-id-here' // Get from categories
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## 🚀 Part 4: Deploy to Vercel

### Step 1: Prepare for Deployment

1. Create `vercel.json` in your frontend directory:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

2. Ensure your frontend builds successfully:
   ```bash
   cd frontend
   npm run build
   ```

### Step 2: Deploy to Vercel

**Option A: Deploy via Vercel CLI**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd frontend
   vercel
   ```

3. Follow prompts:
   - Link to existing project or create new
   - Set root directory to `frontend`
   - Select framework: **Vite**

**Option B: Deploy via GitHub**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **New Project**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables in Vercel

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
3. Click **Save**
4. Redeploy: **Deployments** → **Redeploy**

### Step 4: Update Supabase URLs

Go back to Supabase → **Authentication** → **URL Configuration**:

1. Update **Site URL**: `https://your-app.vercel.app`
2. Add to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## 🧪 Part 5: Testing

### Test Locally

1. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

2. Test authentication:
   - Go to `http://localhost:5173/login`
   - Click **Sign in with Google** or **Sign in with Microsoft**
   - Should redirect to OAuth provider
   - After auth, should redirect back to your app

3. Test database operations:
   - Create a new process
   - Check Supabase → **Table Editor** → `processes` to verify data

### Test Production

1. Go to your Vercel URL: `https://your-app.vercel.app`
2. Test same authentication flow
3. Verify all features work

---

## 🎉 You're Done!

Your app is now running on:
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google + Microsoft)
- **Frontend Hosting**: Vercel
- **Backend**: Option to use Supabase Edge Functions or keep Express API

### Optional: Backend API

**Option A: Supabase Edge Functions** (Recommended for simple APIs)
- Deploy serverless functions for Claude API calls
- Keep backend/frontend on same platform

**Option B: Keep Express Backend**
- Deploy backend to Vercel, Railway, or Render
- Update frontend API calls to new backend URL

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Vite + Vercel Guide](https://vercel.com/docs/frameworks/vite)

---

## ❓ Troubleshooting

**Auth not working:**
- Check callback URLs in both Supabase and OAuth providers
- Verify environment variables are set correctly
- Check browser console for errors

**Database errors:**
- Check RLS policies in Supabase
- Verify user is authenticated before queries
- Check table permissions

**Build failures:**
- Ensure all environment variables are set in Vercel
- Check build logs for specific errors
- Verify dependencies are in `package.json`
