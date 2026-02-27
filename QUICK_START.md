# Quick Start - Create Your First User

## The app is stuck on "Loading..." because you need to create a user in Supabase first!

### Step 1: Create User in Supabase Auth

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **Authentication** → **Users**
3. Click **"Add User"** button
4. Enter:
   - **Email**: `admin@penkey.com` (or your email)
   - **Password**: `admin123` (or your password)
   - **Auto Confirm User**: Toggle ON ✅
5. Click **"Create User"**

### Step 2: Run the Auto-Create Migration

The app will automatically create a staff profile when you sign up, but you need to run migration 004 first:

1. Go to **SQL Editor** in Supabase
2. Copy and paste the contents of: `supabase/migrations/004_auto_create_staff.sql`
3. Click **"Run"**

### Step 3: Update User to Admin (Optional)

If you want admin access, run this SQL:

```sql
UPDATE users 
SET role = 'admin'
WHERE email = 'admin@penkey.com';
```

### Step 4: Login

Now go to http://localhost:3000/auth/login and sign in with your email/password!

---

## Why was it stuck on "Loading..."?

The app was trying to load your user profile from the `users` table, but no profile existed yet. The middleware and useUser hook were waiting for profile data that didn't exist.

After creating the user in Supabase Auth and running the migration, the trigger will automatically create the profile, and the app will load correctly!
