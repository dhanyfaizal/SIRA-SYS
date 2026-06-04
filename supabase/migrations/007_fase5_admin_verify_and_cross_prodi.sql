-- ============================================================
-- SIRA-SYS · Migration 007 · Lintas Prodi & Verifikasi Pengguna
-- ============================================================

-- 1. Tambah kolom is_verified ke tabel profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Update pengguna yang sudah ada agar terverifikasi secara default
UPDATE public.profiles SET is_verified = TRUE;

-- 2. Ubah CHECK constraint role pada profiles (hapus 'mahasiswa')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Jika ada user yang saat ini rolenya mahasiswa, ubah jadi dosen DULU sebelum menambah constraint
UPDATE public.profiles SET role = 'dosen' WHERE role = 'mahasiswa';

-- Tambahkan check constraint baru setelah data dibersihkan
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'kaprodi', 'dosen'));

-- 3. Perbarui RLS pada tabel mata_kuliah agar dosen bisa memilih MK lintas prodi
DROP POLICY IF EXISTS "read_own_prodi_mk" ON mata_kuliah;
DROP POLICY IF EXISTS "kaprodi_manage_mk" ON mata_kuliah;

-- SELECT: Semua user terautentikasi
CREATE POLICY "authenticated_select_mk" ON mata_kuliah
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: Semua user terautentikasi (Dosen membuat MK baru secara mandiri)
CREATE POLICY "authenticated_insert_mk" ON mata_kuliah
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE/DELETE: Kaprodi se-prodi dan Admin
CREATE POLICY "kaprodi_admin_modify_mk" ON mata_kuliah
  FOR ALL USING (
    my_role() = 'admin' 
    OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id())
  );

-- 4. Buat function SECURITY DEFINER untuk admin menghapus pengguna dari auth.users
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Pastikan pemanggil adalah admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus pengguna.';
  END IF;
  
  -- Hapus dari auth.users (akan memicu cascade delete di public.profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
