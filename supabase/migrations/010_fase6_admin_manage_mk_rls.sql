-- ============================================================
-- SIRA-SYS · Migration 010 · Izin Admin Mengelola Mata Kuliah
-- ============================================================

-- 1. Perbarui RLS pada tabel mata_kuliah agar Admin bisa mengupdate data mata kuliah di prodi mana saja
DROP POLICY IF EXISTS "kaprodi_manage_mk" ON public.mata_kuliah;

CREATE POLICY "kaprodi_manage_mk" ON public.mata_kuliah
  FOR ALL TO authenticated
  USING (my_role() = 'admin' OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id()))
  WITH CHECK (my_role() = 'admin' OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id()));
