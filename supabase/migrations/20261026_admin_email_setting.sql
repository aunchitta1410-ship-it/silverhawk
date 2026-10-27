-- Migration: Store Admin Email & Settings in Database
-- Key: admin_email in public.site_settings

INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'admin_email',
  jsonb_build_object(
    'email', 'admin@silverhawk.com',
    'notification_emails', jsonb_build_array(
      'admin@silverhawk.com',
      'silverhawkgroup.dmc@gmail.com',
      'aunchitta1410@gmail.com'
    ),
    'label', 'Primary System Administrator'
  ),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
