-- ============================================
-- MIGRATION 01: TABLES, ENUMS & AUTOMATION
-- Studio WFH Manager - Supabase PostgreSQL
-- ============================================

-- ─── CUSTOM ENUMS ────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE task_status AS ENUM ('todo', 'inprogress', 'review', 'revision', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- ─── 1. TABEL DIVISIONS ──────────────────────
CREATE TABLE divisions (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data awal divisi Studio Kreatif
INSERT INTO divisions (name) VALUES
  ('Animasi'),
  ('Komik & Ilustrasi'),
  ('Background Art'),
  ('Sound & Music');

-- ─── 2. TABEL PROFILES ───────────────────────
CREATE TABLE profiles (
    id             UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name      TEXT NOT NULL,
    avatar_url     TEXT,
    role           user_role NOT NULL DEFAULT 'employee',
    division_id    BIGINT REFERENCES divisions(id) ON DELETE SET NULL,
    is_online      BOOLEAN DEFAULT false,
    is_first_login BOOLEAN DEFAULT true,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 3. TABEL PROJECTS ───────────────────────
CREATE TABLE projects (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    division_id BIGINT REFERENCES divisions(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES profiles(id),
    deadline    TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 4. TABEL TASKS ──────────────────────────
CREATE TABLE tasks (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    status        task_status NOT NULL DEFAULT 'todo',
    priority      task_priority NOT NULL DEFAULT 'medium',
    assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    gdrive_link   TEXT,
    revision_note TEXT,
    deadline      TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 5. TABEL AUDIT LOGS ─────────────────────
CREATE TABLE audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    details    TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUTOMATION: TRIGGER SINKRONISASI USER BARU
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_first_login, division_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Artist'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee'),
    true,
    NULLIF(new.raw_user_meta_data->>'division_id', '')::BIGINT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- AUTOMATION: FUNGSI AUDIT LOG
-- (Dipanggil dari sisi app, bukan trigger DB)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action  TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (p_user_id, p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME: AKTIFKAN UNTUK TABEL TASKS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================
-- STORAGE: BUAT BUCKET AVATARS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;