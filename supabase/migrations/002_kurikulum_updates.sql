-- ============================================================
-- SIRA-SYS · Migration 002 · Kurikulum & RLS Updates
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom extracted_data ke tabel kurikulum_docs
ALTER TABLE kurikulum_docs 
  ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{"profil_lulusan": [], "cpl": []}';

-- 2. Kebijakan RLS untuk kurikulum_docs (baca & tulis)
ALTER TABLE kurikulum_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prodi_read_kurikulum_docs" ON kurikulum_docs;
CREATE POLICY "prodi_read_kurikulum_docs" ON kurikulum_docs
  FOR SELECT USING (prodi_id = my_prodi_id() OR my_role() = 'admin');

DROP POLICY IF EXISTS "kaprodi_manage_kurikulum_docs" ON kurikulum_docs;
CREATE POLICY "kaprodi_manage_kurikulum_docs" ON kurikulum_docs
  FOR ALL USING (my_role() IN ('kaprodi','admin') AND prodi_id = my_prodi_id());

-- 3. Kebijakan RLS untuk Kaprodi menghapus draf RPS dalam prodinya
DROP POLICY IF EXISTS "kaprodi_delete_prodi_draft_rps" ON rps;
CREATE POLICY "kaprodi_delete_prodi_draft_rps" ON rps
  FOR DELETE USING (
    my_role() = 'kaprodi'
    AND status = 'draft'
    AND mk_id IN (SELECT id FROM mata_kuliah WHERE prodi_id = my_prodi_id())
  );

-- 4. Kebijakan RLS untuk Kaprodi mengupdate status & review RPS dalam prodinya
DROP POLICY IF EXISTS "kaprodi_update_prodi_rps" ON rps;
CREATE POLICY "kaprodi_update_prodi_rps" ON rps
  FOR UPDATE USING (
    my_role() = 'kaprodi'
    AND mk_id IN (SELECT id FROM mata_kuliah WHERE prodi_id = my_prodi_id())
  )
  WITH CHECK (
    my_role() = 'kaprodi'
    AND mk_id IN (SELECT id FROM mata_kuliah WHERE prodi_id = my_prodi_id())
  );

-- 5. Kebijakan RLS agar pengguna terautentikasi dapat membaca data profil pengguna lain (untuk tanda tangan & info Dosen/Kaprodi)
DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- 6. Kebijakan RLS agar pengguna terautentikasi dapat membaca data program studi
ALTER TABLE program_studi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_program_studi" ON program_studi;
CREATE POLICY "authenticated_read_program_studi" ON program_studi
  FOR SELECT TO authenticated USING (true);

-- 7. Tambah kolom is_active ke kurikulum_docs
ALTER TABLE kurikulum_docs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 8. Trigger untuk memastikan hanya ada satu kurikulum aktif per prodi
CREATE OR REPLACE FUNCTION set_only_one_active_kurikulum()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE kurikulum_docs 
    SET is_active = false 
    WHERE prodi_id = NEW.prodi_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_single_active_kurikulum ON kurikulum_docs;
CREATE TRIGGER ensure_single_active_kurikulum
  BEFORE INSERT OR UPDATE OF is_active ON kurikulum_docs
  FOR EACH ROW
  EXECUTE FUNCTION set_only_one_active_kurikulum();


