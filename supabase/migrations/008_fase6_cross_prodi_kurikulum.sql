-- ============================================================
-- SIRA-SYS · Migration 008 · Akses Kurikulum Lintas Prodi
-- ============================================================

-- 1. Perbarui RLS pada tabel kurikulum_docs agar semua pengguna terautentikasi dapat membaca dokumen kurikulum lintas prodi
DROP POLICY IF EXISTS "prodi_read_kurikulum_docs" ON public.kurikulum_docs;

CREATE POLICY "authenticated_read_kurikulum_docs" ON public.kurikulum_docs
  FOR SELECT TO authenticated USING (true);
