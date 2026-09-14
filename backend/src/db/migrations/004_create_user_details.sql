-- ============================================================================
-- Migration: 004_create_user_details.sql
-- Description: Create user_details table for storing engineer profile and CAD preferences
-- ============================================================================

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
    settings JSONB DEFAULT '{"auto_drc": true, "theme": "dark", "default_board_finish": "ENIG", "default_layer_count": 2}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own details" ON public.user_details;
DROP POLICY IF EXISTS "Users can insert own details" ON public.user_details;
DROP POLICY IF EXISTS "Users can update own details" ON public.user_details;

CREATE POLICY "Users can view own details" ON public.user_details
    FOR SELECT USING (
        auth.uid() = id 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can insert own details" ON public.user_details
    FOR INSERT WITH CHECK (
        auth.uid() = id 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can update own details" ON public.user_details
    FOR UPDATE USING (
        auth.uid() = id 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    ) WITH CHECK (
        auth.uid() = id 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- Trigger to automatically seed user_details on auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user_details()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_details (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Hardware Engineer')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.user_details.full_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_details ON auth.users;
CREATE TRIGGER on_auth_user_created_details
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_details();
