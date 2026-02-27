-- ============================================
-- AUTO-CREATE STAFF USERS ON SIGNUP
-- ============================================
-- This trigger automatically creates a user profile with 'staff' role
-- when a new user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user profile with staff role
  -- Note: site_id will need to be set by admin later, or you can set a default site
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- NOTES
-- ============================================
/*
How it works:
1. When a new user signs up via Supabase Auth, they are added to auth.users
2. This trigger automatically creates a matching profile in public.users
3. The user is assigned 'staff' role by default
4. The user is set to active (is_active = true)
5. Full name is extracted from metadata or email username
6. Admin can later change the role to 'admin' via the admin panel

Important:
- site_id is initially NULL - admin must assign user to a site
- Alternatively, you can set a default site_id in the INSERT statement above
- To set a default site, replace the INSERT with:
  
  INSERT INTO public.users (id, email, full_name, role, site_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff',
    'YOUR-DEFAULT-SITE-ID-HERE',  -- Replace with actual site UUID
    true
  );
*/
