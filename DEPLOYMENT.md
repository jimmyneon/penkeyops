# Penkey Ops - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Vercel account (for deployment)
- SMTP email service configured in Supabase (for magic links)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and set project name: `penkey-ops`
4. Set a strong database password (save this!)
5. Choose region closest to your users
6. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migrations

In the Supabase SQL Editor, run the migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_helper_functions.sql`
4. `supabase/migrations/004_auto_create_staff.sql` (Auto-creates staff profiles on signup)
-- Click "Run"
-- Copy and paste contents of supabase/migrations/002_rls_policies.sql
-- Click "Run"
```

**Third: Helper Functions**
```sql
-- Copy and paste contents of supabase/migrations/003_helper_functions.sql
-- Click "Run"
```

**Fourth: Seed Data (Optional but recommended)**
```sql
-- Copy and paste contents of scripts/seed-database.sql
-- Click "Run"
```

### 1.3 Configure Storage

1. Go to Storage in Supabase dashboard
2. Click "New Bucket"
3. Name: `evidence-photos`
4. Public bucket: **Yes** (photos need to be viewable)
5. Click "Create Bucket"

### 1.4 Configure Authentication

1. Go to Authentication > Providers
2. Enable "Email" provider
3. Disable "Confirm email" (we want magic links only)
4. Go to Authentication > Email Templates
5. Customize "Magic Link" template if desired
6. Set "Site URL" to your production URL (or `http://localhost:3000` for development)

### 1.5 Get API Keys

1. Go to Project Settings > API
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 2: Generate VAPID Keys

Run the key generation script:

```bash
node scripts/generate-vapid-keys.js
```

Copy the output keys - you'll need them for environment variables.

## Step 3: Local Development Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Configure Environment Variables

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### 3.3 Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 4: Test Locally

### 4.1 Create First User

1. Go to `http://localhost:3000/auth/login`
2. Enter email: `admin@penkeyops.com` (or any email)
3. Check your email for magic link
4. Click the link to log in

### 4.2 Set User Role in Database

Since the first user won't have a profile yet:

1. Go to Supabase > Table Editor > `users`
2. Find your user (by email)
3. Set `role` to `admin`
4. Set `site_id` to the test site ID from seed data
5. Set `is_active` to `true`

### 4.3 Test Core Workflow

1. **Start a shift** - Click "Start Opening Shift"
2. **Complete tasks** - Work through the checklist
3. **Log temperature** - Use Quick Actions > Log Temp
4. **Complete shift** - All critical tasks must be done
5. **Admin features** - Go to Admin dashboard (Settings icon)

## Step 5: Deploy to Vercel

### 5.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Penkey Ops"
git branch -M main
git remote add origin https://github.com/yourusername/penkey-ops.git
git push -u origin main
```

### 5.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 5.3 Add Environment Variables

In Vercel project settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### 5.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit your deployed app!

## Step 6: Configure Supabase for Production

### 6.1 Update Site URL

1. Go to Supabase > Authentication > URL Configuration
2. Set "Site URL" to your Vercel URL: `https://your-app.vercel.app`
3. Add redirect URLs:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**`

### 6.2 Set up Edge Functions (Optional - for scheduled reminders)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

3. Deploy edge function:
```bash
supabase functions deploy send-reminders
```

4. Set up cron job in Supabase:
   - Go to Database > Extensions
   - Enable `pg_cron`
   - Run in SQL Editor:
```sql
SELECT cron.schedule(
  'send-overdue-reminders',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## Step 7: Production Checklist

- [ ] All migrations run successfully
- [ ] Seed data loaded (or real data entered)
- [ ] Storage bucket created and configured
- [ ] Authentication working (magic links sent)
- [ ] Environment variables set in Vercel
- [ ] Site URL configured in Supabase
- [ ] VAPID keys generated and configured
- [ ] Test user can log in and complete workflow
- [ ] Admin can access admin dashboard
- [ ] Templates created and active
- [ ] RLS policies working (users can only see their site's data)
- [ ] PWA installable on mobile devices
- [ ] Push notifications working (if enabled)

## Step 8: Create Production Users

### Option 1: Manual Entry

1. Go to Supabase > Table Editor > `users`
2. Click "Insert row"
3. Fill in:
   - `id`: Generate a UUID
   - `email`: Staff member's email
   - `full_name`: Their name
   - `role`: `staff` or `admin`
   - `site_id`: Your site's ID
   - `is_active`: `true`

### Option 2: CSV Import

1. Go to Admin > Import
2. Download sample CSV
3. Fill in user details
4. Upload CSV

### Option 3: Auto-creation

Users are automatically created when they first log in via magic link. You'll just need to:
1. Set their `site_id`
2. Set their `role`
3. Set `is_active` to `true`

## Troubleshooting

### Magic Links Not Sending

- Check Supabase > Authentication > Email Templates
- Verify SMTP settings in Supabase
- Check spam folder
- Try with a different email provider

### RLS Errors

- Ensure user has `site_id` set
- Check RLS policies are enabled
- Verify user is authenticated

### Build Errors

- Run `npm run build` locally first
- Check all environment variables are set
- Review build logs in Vercel

### Photos Not Uploading

- Verify storage bucket exists and is public
- Check CORS settings in Supabase Storage
- Ensure user has permission to upload

## Monitoring

### Supabase Dashboard

- Monitor database usage
- Check API logs
- Review authentication logs
- Monitor storage usage

### Vercel Dashboard

- Check deployment logs
- Monitor function executions
- Review error logs
- Check performance metrics

## Backup Strategy

### Database Backups

Supabase automatically backs up your database daily. To manually backup:

1. Go to Database > Backups
2. Click "Create Backup"
3. Download backup file

### Export Data

Use the Admin > Reports > Export feature to download compliance data regularly.

## Support

For issues:
1. Check logs in Supabase and Vercel
2. Review this deployment guide
3. Check `PROJECT_SUMMARY.md` for feature status
4. Review `README.md` for architecture details

---

**Deployment complete! Your café operations app is ready to use.**
