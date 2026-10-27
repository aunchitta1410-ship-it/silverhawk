-- ==============================================================================
-- Migration: Support 5 Tour Types, Categories, Subcategories, General Information,
-- and Pick-up Extra Fees Configuration
-- Run this in your Supabase Dashboard -> SQL Editor if you want to store these
-- fields directly in Supabase table columns in addition to local fallback storage.
-- ==============================================================================

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS tour_type TEXT DEFAULT 'Tour Package',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Island & Marine',
  ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT 'One Day Trip',
  ADD COLUMN IF NOT EXISTS charges_extra_pickup_fee BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_recommended TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tour_includes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tour_excludes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS what_to_bring TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- Create payments slip and verification status columns if not exists
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS slip_url TEXT,
  ADD COLUMN IF NOT EXISTS slip_filename TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT;
