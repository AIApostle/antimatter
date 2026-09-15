-- ============================================================================
-- Migration: 003_auth_profiles_and_sync.sql
-- Description: Ensure profiles, user_details, triggers and RLS policies for auth
-- ============================================================================

-- 1. Ensure public.profiles table exists with all required fields
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferred_level TEXT DEFAULT 'Intermediate',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Ensure public.user_details table exists with complete engineering preferences
CREATE TABLE IF NOT EXISTS public.user_details (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'Hardware Engineer',
    organization TEXT DEFAULT '',
    experience_level TEXT DEFAULT 'Intermediate',
    preferred_eda TEXT DEFAULT 'KiCad 8',
    preferred_mcu TEXT DEFAULT 'ESP32 / ARM Cortex',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    settings JSONB DEFAULT '{
        "theme": "dark",
        "auto_drc": true,
        "default_layer_count": 2,
        "default_board_finish": "ENIG"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_details_email ON public.user_details(email);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
        OR auth.role() = 'service_role'
    ) WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- 5. RLS Policies for User Details
DROP POLICY IF EXISTS "Users can view own details" ON public.user_details;
CREATE POLICY "Users can view own details" ON public.user_details
    FOR SELECT USING (
        auth.uid() = id
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Users can update own details" ON public.user_details;
CREATE POLICY "Users can update own details" ON public.user_details
    FOR UPDATE USING (
        auth.uid() = id
        OR auth.role() = 'service_role'
    ) WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Users can insert own details" ON public.user_details;
CREATE POLICY "Users can insert own details" ON public.user_details
    FOR INSERT WITH CHECK (
        auth.uid() = id
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- 6. Trigger Function to automatically sync new auth.users into profiles & user_details
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role TEXT;
    user_level TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Hardware Engineer');
    user_level := COALESCE(NEW.raw_user_meta_data->>'experience_level', 'Intermediate');

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, email, full_name, preferred_level, created_at, updated_at)
    VALUES (NEW.id, NEW.email, user_name, user_level, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    -- Insert into public.user_details
    INSERT INTO public.user_details (
        id, email, full_name, role, experience_level,
        preferred_eda, preferred_mcu, settings, created_at, updated_at
    )
    VALUES (
        NEW.id, NEW.email, user_name, user_role, user_level,
        'KiCad 8', 'ESP32 / ARM Cortex',
        '{"theme": "dark", "auto_drc": true, "default_layer_count": 2, "default_board_finish": "ENIG"}'::jsonb,
        NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.user_details.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users if permissions allow
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create trigger on auth.users directly: %', SQLERRM;
END;
$$;
