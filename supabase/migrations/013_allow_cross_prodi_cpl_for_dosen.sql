-- ============================================================
-- SIRA-SYS · Migration 013 · CPL Lintas Prodi untuk Dosen
-- ============================================================

-- 1. Hapus kebijakan select_kurikulum_docs yang membatasi akses baca berdasarkan homebase
DROP POLICY IF EXISTS "select_kurikulum_docs" ON public.kurikulum_docs;

-- 2. Buat kebijakan baru agar semua pengguna terautentikasi (dosen) dapat membaca dokumen kurikulum lintas prodi
CREATE POLICY "select_kurikulum_docs" ON public.kurikulum_docs
  FOR SELECT TO authenticated
  USING (true);
