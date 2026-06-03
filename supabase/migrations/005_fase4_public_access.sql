-- ============================================================
-- SIRA-SYS · Migration 005 · Akses Publik & API SIAKAD
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. RLS untuk program_studi: Izinkan akses SELECT bagi publik (anonymous/guest)
DROP POLICY IF EXISTS "public_read_program_studi" ON program_studi;
CREATE POLICY "public_read_program_studi" ON program_studi
  FOR SELECT USING (true);

-- 2. RLS untuk mata_kuliah: Izinkan akses SELECT bagi publik (anonymous/guest)
DROP POLICY IF EXISTS "public_read_mata_kuliah" ON mata_kuliah;
CREATE POLICY "public_read_mata_kuliah" ON mata_kuliah
  FOR SELECT USING (true);

-- 3. RLS untuk profiles: Izinkan akses SELECT bagi publik (anonymous/guest)
-- Terbatas hanya untuk dosen, kaprodi, dan admin (tidak membocorkan profil mahasiswa)
DROP POLICY IF EXISTS "public_read_dosen_profiles" ON profiles;
CREATE POLICY "public_read_dosen_profiles" ON profiles
  FOR SELECT USING (role IN ('dosen', 'kaprodi', 'admin'));
