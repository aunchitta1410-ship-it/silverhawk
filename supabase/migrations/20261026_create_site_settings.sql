-- Create site_settings table for persistent CMS and configuration storage
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to site settings
CREATE POLICY "Allow public read access on site_settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow service role full access to insert/update site settings
CREATE POLICY "Allow service role full access on site_settings"
  ON public.site_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
