# Penkey Ops Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key

# Optional: For production
VAPID_PRIVATE_KEY=your-vapid-private-key
```

## Getting Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to Project Settings > API
3. Copy the Project URL and anon/public key
4. Copy the service_role key (keep this secret!)

## Database Setup

1. Run the SQL migration files in `/supabase/migrations/` in order
2. The schema will create all necessary tables, RLS policies, and functions

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## PWA Installation

The app is installable as a PWA. On mobile devices, use "Add to Home Screen" from your browser menu.
