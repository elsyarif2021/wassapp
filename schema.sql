-- ============================================================================
-- WASSAPP - SUPABASE DATABASE SCHEMA (BERSIH & LENGKAP)
-- ============================================================================
-- CATATAN PENTING:
-- Anda HANYA perlu menjalankan skrip ini jika:
-- 1. Membuat project database Supabase baru dari nol, ATAU
-- 2. Ingin mereset total seluruh database aplikasi.
--
-- Jika database Anda saat ini sudah berjalan dan login/chat sudah bisa,
-- Anda TIDAK PERLU menjalankan ulang skrip ini.
-- ============================================================================

-- LANGKAH 1: EKSTENSI UUID & CRYPTO
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- LANGKAH 2: TABEL USERS (Guru & Pengguna)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  mata_pelajaran TEXT DEFAULT 'Belum diatur', -- Menyimpan Nomor HP / Mata Pelajaran
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT '',           -- SHA-256 Hashed Password
  avatar TEXT DEFAULT '',
  status TEXT DEFAULT 'Offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LANGKAH 3: TABEL GROUPS (Grup Diskusi Guru)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LANGKAH 4: TABEL GROUP_MEMBERS (Anggota Grup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================================
-- LANGKAH 5: TABEL MESSAGES (Pesan Pribadi, Grup, Gambar, & Audio)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  message_text TEXT DEFAULT '',
  message_type TEXT DEFAULT 'TEXT',             -- 'TEXT' | 'IMAGE' | 'AUDIO'
  attachment_url TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- LANGKAH 6: TABEL CALLS (Sinyal WebRTC Voice Call & Video Call)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.calls (
  id TEXT PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL DEFAULT 'voice',     -- 'voice' | 'video'
  status TEXT NOT NULL DEFAULT 'ringing',      -- 'ringing' | 'answered' | 'rejected' | 'ended'
  offer TEXT,
  answer TEXT,
  ice_candidates TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LANGKAH 7: TABEL STATUSES (Update Status / Stories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'text',     -- 'text' | 'image'
  content_text TEXT,
  media_url TEXT,
  audio_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'all',           -- 'all' | 'selected'
  allowed_users TEXT DEFAULT '[]',               -- JSON array of user IDs stringified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- ============================================================================
-- LANGKAH 8: INDEX PERFORMA TINGGI
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(mata_pelajaran);
CREATE INDEX IF NOT EXISTS idx_messages_direct ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_group ON public.messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee ON public.calls(callee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_user ON public.statuses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON public.statuses(expires_at);

-- ============================================================================
-- LANGKAH 9: NONAKTIFKAN ROW LEVEL SECURITY (RLS)
-- Akses REST API langsung menggunakan anon key
-- ============================================================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LANGKAH 10: HAK AKSES PERMISSION (GRANT)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ============================================================================
-- LANGKAH 11: AKTIFKAN SUPABASE REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'calls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'statuses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
  END IF;
END $$;
