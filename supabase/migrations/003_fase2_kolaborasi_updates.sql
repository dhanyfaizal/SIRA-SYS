-- ============================================================
-- SIRA-SYS · Migration 003 · Kolaborasi & Alur Persetujuan RPS
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom team_dosen ke tabel rps (menyimpan UUID Dosen anggota tim pengajar)
ALTER TABLE rps 
  ADD COLUMN IF NOT EXISTS team_dosen UUID[] DEFAULT '{}';

-- Memperbarui RLS policy "dosen_own_rps" agar anggota tim pengajar juga bisa mengakses & mengedit
DROP POLICY IF EXISTS "dosen_own_rps" ON rps;
CREATE POLICY "dosen_own_rps" ON rps
  FOR ALL USING (auth.uid() = dosen_id OR auth.uid() = ANY(team_dosen));

-- 2. Tambah kolom review_notes ke tabel rps (menyimpan catatan revisi terstruktur per langkah)
ALTER TABLE rps 
  ADD COLUMN IF NOT EXISTS review_notes JSONB DEFAULT '{}'::jsonb;

-- 3. Membuat tabel rps_comments (fitur diskusi internal perkuliahan)
CREATE TABLE IF NOT EXISTS rps_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id     UUID REFERENCES rps(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  section    TEXT, -- 'identitas' | 'capaian' | 'rencana' | 'penilaian' | 'referensi'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rps_comments ENABLE ROW LEVEL SECURITY;

-- Policy untuk rps_comments (SELECT): Dosen pemilik, Tim pengajar, Kaprodi se-prodi, & Admin
DROP POLICY IF EXISTS "read_rps_comments" ON rps_comments;
CREATE POLICY "read_rps_comments" ON rps_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rps 
      JOIN mata_kuliah mk ON rps.mk_id = mk.id
      WHERE rps.id = rps_comments.rps_id
      AND (
        rps.dosen_id = auth.uid()
        OR auth.uid() = ANY(rps.team_dosen)
        OR (my_role() = 'kaprodi' AND mk.prodi_id = my_prodi_id())
        OR my_role() = 'admin'
      )
    )
  );

-- Policy untuk rps_comments (INSERT): Dosen pemilik, Tim pengajar, Kaprodi se-prodi, & Admin
DROP POLICY IF EXISTS "insert_rps_comments" ON rps_comments;
CREATE POLICY "insert_rps_comments" ON rps_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rps 
      JOIN mata_kuliah mk ON rps.mk_id = mk.id
      WHERE rps.id = rps_comments.rps_id
      AND (
        rps.dosen_id = auth.uid()
        OR auth.uid() = ANY(rps.team_dosen)
        OR (my_role() = 'kaprodi' AND mk.prodi_id = my_prodi_id())
        OR my_role() = 'admin'
      )
    )
  );

-- Policy untuk rps_comments (DELETE): Hanya pemilik komentar
DROP POLICY IF EXISTS "delete_own_comments" ON rps_comments;
CREATE POLICY "delete_own_comments" ON rps_comments
  FOR DELETE USING (user_id = auth.uid());

-- 4. Membuat tabel notifications (notifikasi web internal)
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy untuk notifications (ALL): Hanya pengguna pemilik notifikasi
DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
