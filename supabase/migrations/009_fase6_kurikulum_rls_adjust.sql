-- ============================================================
-- SIRA-SYS · Migration 009 · Penyesuaian RLS Kurikulum Role-based
-- ============================================================

-- 1. Hapus kebijakan RLS lama pada kurikulum_docs
DROP POLICY IF EXISTS "authenticated_read_kurikulum_docs" ON public.kurikulum_docs;
DROP POLICY IF EXISTS "prodi_read_kurikulum_docs" ON public.kurikulum_docs;
DROP POLICY IF EXISTS "kaprodi_manage_kurikulum_docs" ON public.kurikulum_docs;

-- 2. Buat kebijakan RLS SELECT (Baca): Admin dapat membaca semua, lainnya hanya prodinya sendiri
CREATE POLICY "select_kurikulum_docs" ON public.kurikulum_docs
  FOR SELECT TO authenticated
  USING (my_role() = 'admin' OR prodi_id = my_prodi_id());

-- 3. Buat kebijakan RLS WRITE (ALL): Admin bebas, Ka. Prodi hanya untuk prodinya sendiri
CREATE POLICY "write_kurikulum_docs" ON public.kurikulum_docs
  FOR ALL TO authenticated
  USING (my_role() = 'admin' OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id()))
  WITH CHECK (my_role() = 'admin' OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id()));
