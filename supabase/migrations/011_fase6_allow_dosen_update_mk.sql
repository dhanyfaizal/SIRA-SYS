-- ============================================================
-- SIRA-SYS · Migration 011 · Izinkan Dosen Mengubah Mata Kuliah
-- ============================================================

-- Izinkan semua pengguna terautentikasi untuk mengupdate data mata kuliah.
-- Hal ini berguna ketika dosen ingin mengoreksi nama, SKS, atau semester
-- mata kuliah yang sudah ada ketika membuat RPS baru.

DROP POLICY IF EXISTS "authenticated_update_mk" ON public.mata_kuliah;

CREATE POLICY "authenticated_update_mk" ON public.mata_kuliah
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
