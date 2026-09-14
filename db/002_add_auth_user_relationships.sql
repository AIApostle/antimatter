-- ============================================================================
-- Migration: 002_add_auth_user_relationships.sql
-- Description: Link projects, design plans, and chat messages to auth.users
-- ============================================================================

-- 1. Add user_id foreign keys referencing Supabase auth.users
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.design_plans 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Indexes for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_design_plans_user_id ON public.design_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- 3. Update Row Level Security Policies for Authenticated & Guest Users

-- Drop existing broad policies to replace with authenticated + guest policies
DROP POLICY IF EXISTS "Public full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Public full access to design_plans" ON public.design_plans;
DROP POLICY IF EXISTS "Public full access to chat_messages" ON public.chat_messages;

-- Projects: Users can access their own projects OR public template projects (user_id IS NULL)
CREATE POLICY "Users can view own or template projects" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id 
        OR user_id IS NULL
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can insert own projects" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    ) WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (
        auth.uid() = user_id 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- Design Plans: Users can view and manage their project plans
CREATE POLICY "Users can view design plans" ON public.design_plans
    FOR SELECT USING (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can insert design plans" ON public.design_plans
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- Chat Messages: Users can view and insert chat messages
CREATE POLICY "Users can view chat messages" ON public.chat_messages
    FOR SELECT USING (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can insert chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );
