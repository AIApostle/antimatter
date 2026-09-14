-- ============================================================================
-- Migration: 003_expand_design_plans_status.sql
-- Description: Expand design_plans status check constraint to include pending_approval
-- ============================================================================

ALTER TABLE public.design_plans DROP CONSTRAINT IF EXISTS design_plans_status_check;
ALTER TABLE public.design_plans ADD CONSTRAINT design_plans_status_check 
    CHECK (status IN ('pending', 'pending_approval', 'approved', 'rejected', 'modified'));
