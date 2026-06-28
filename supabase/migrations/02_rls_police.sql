-- ============================================
-- MIGRATION 02: ROW LEVEL SECURITY POLICIES
-- Studio WFH Manager
-- ============================================

-- ─── AKTIFKAN RLS DI SEMUA TABEL ─────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Ambil role user yang login
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ambil division_id user yang login
CREATE OR REPLACE FUNCTION public.get_my_division()
RETURNS BIGINT AS $$
  SELECT division_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- POLICIES: TABEL PROFILES
-- ============================================

-- Semua user yang login bisa melihat semua profil
-- (dibutuhkan untuk assign task & tampilkan nama)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- User hanya bisa update profil dirinya sendiri
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Hanya admin yang bisa INSERT profil baru
-- (via trigger handle_new_user yang pakai SECURITY DEFINER)
CREATE POLICY "profiles_insert_trigger_only"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

-- Hanya admin yang bisa menghapus profil
CREATE POLICY "profiles_delete_admin_only"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ============================================
-- POLICIES: TABEL DIVISIONS
-- ============================================

-- Semua user bisa melihat divisi (untuk dropdown form)
CREATE POLICY "divisions_select_all"
  ON divisions FOR SELECT
  TO authenticated
  USING (true);

-- Hanya admin yang bisa kelola divisi
CREATE POLICY "divisions_manage_admin"
  ON divisions FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================
-- POLICIES: TABEL PROJECTS
-- ============================================

-- Admin: bisa lihat semua project
CREATE POLICY "projects_select_admin"
  ON projects FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Manager: hanya bisa lihat project divisinya
CREATE POLICY "projects_select_manager"
  ON projects FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND division_id = public.get_my_division()
  );

-- Employee: hanya bisa lihat project yang punya task untuknya
CREATE POLICY "projects_select_employee"
  ON projects FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'employee'
    AND id IN (
      SELECT DISTINCT project_id FROM tasks
      WHERE assigned_to = auth.uid()
    )
  );

-- Manager: bisa INSERT project di divisinya sendiri
CREATE POLICY "projects_insert_manager"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'manager'
    AND division_id = public.get_my_division()
  );

-- Manager: bisa UPDATE/DELETE project divisinya
CREATE POLICY "projects_update_manager"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND division_id = public.get_my_division()
  );

CREATE POLICY "projects_delete_manager"
  ON projects FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND division_id = public.get_my_division()
  );

-- ============================================
-- POLICIES: TABEL TASKS
-- ============================================

-- Admin: lihat semua task
CREATE POLICY "tasks_select_admin"
  ON tasks FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Manager: lihat task di project divisinya
CREATE POLICY "tasks_select_manager"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND project_id IN (
      SELECT id FROM projects
      WHERE division_id = public.get_my_division()
    )
  );

-- Employee: hanya lihat task miliknya
CREATE POLICY "tasks_select_employee"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'employee'
    AND assigned_to = auth.uid()
  );

-- Manager: bisa INSERT task di project divisinya
CREATE POLICY "tasks_insert_manager"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'manager'
    AND project_id IN (
      SELECT id FROM projects
      WHERE division_id = public.get_my_division()
    )
  );

-- Manager: bisa UPDATE semua field task di divisinya
CREATE POLICY "tasks_update_manager"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND project_id IN (
      SELECT id FROM projects
      WHERE division_id = public.get_my_division()
    )
  );

-- Employee: hanya bisa UPDATE status, gdrive_link task miliknya
-- (field lain dikontrol di sisi aplikasi)
CREATE POLICY "tasks_update_employee"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'employee'
    AND assigned_to = auth.uid()
  );

-- Manager: bisa hapus task di divisinya
CREATE POLICY "tasks_delete_manager"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND project_id IN (
      SELECT id FROM projects
      WHERE division_id = public.get_my_division()
    )
  );

-- ============================================
-- POLICIES: TABEL AUDIT LOGS
-- ============================================

-- Hanya admin yang bisa melihat audit log
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Semua user authenticated bisa INSERT log
-- (via fungsi log_activity yang SECURITY DEFINER)
CREATE POLICY "audit_logs_insert_all"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- POLICIES: STORAGE BUCKET AVATARS
-- ============================================

-- Semua orang bisa melihat foto profil (bucket sudah public)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- User hanya bisa upload ke folder dengan nama user_id-nya sendiri
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- User hanya bisa update/delete file miliknya
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );