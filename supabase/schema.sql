-- Multilingual Audio & Video Test File Hosting Platform Schema
-- Run this in your Supabase SQL Editor if connecting to Supabase Postgres

CREATE TABLE IF NOT EXISTS public.languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT,
  badge_color TEXT DEFAULT 'bg-teal-100 text-teal-800 border-teal-300',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Languages
INSERT INTO public.languages (code, name, native_name, badge_color) VALUES
  ('ha', 'Hausa', 'Harshen Hausa', 'bg-emerald-100 text-emerald-800 border-emerald-300'),
  ('ig', 'Igbo', 'Asụsụ Igbo', 'bg-amber-100 text-amber-800 border-amber-300'),
  ('yo', 'Yoruba', 'Èdè Yorùbá', 'bg-indigo-100 text-indigo-800 border-indigo-300'),
  ('pcm', 'Nigerian Pidgin', 'Naijá / Brokin', 'bg-purple-100 text-purple-800 border-purple-300'),
  ('en', 'English', 'English (West African)', 'bg-blue-100 text-blue-800 border-blue-300')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  language TEXT NOT NULL,
  language_code TEXT NOT NULL REFERENCES public.languages(code) ON DELETE RESTRICT,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  file_extension TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  description TEXT,
  tags TEXT,
  upload_status TEXT DEFAULT 'completed',
  is_public INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_media_lang ON public.media_files(language_code);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media_files(media_type);
CREATE INDEX IF NOT EXISTS idx_media_public ON public.media_files(is_public);
CREATE INDEX IF NOT EXISTS idx_media_created ON public.media_files(created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can read languages and public media
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);
CREATE POLICY "Public read active media" ON public.media_files FOR SELECT USING (is_public = 1);
