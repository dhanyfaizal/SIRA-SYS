-- ============================================================
-- SIRA-SYS · Migration 004 · Modul Asesmen OBE
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Membuat tabel kelas_mahasiswa (krs / pendaftaran kelas)
CREATE TABLE IF NOT EXISTS kelas_mahasiswa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mahasiswa_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mk_id          UUID REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  tahun_akademik TEXT NOT NULL,
  semester_aktif TEXT NOT NULL CHECK (semester_aktif IN ('Ganjil', 'Genap')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (mahasiswa_id, mk_id, tahun_akademik, semester_aktif)
);

ALTER TABLE kelas_mahasiswa ENABLE ROW LEVEL SECURITY;

-- RLS untuk kelas_mahasiswa: Semua pengguna terautentikasi dapat membaca
DROP POLICY IF EXISTS "auth_read_kelas_mahasiswa" ON kelas_mahasiswa;
CREATE POLICY "auth_read_kelas_mahasiswa" ON kelas_mahasiswa
  FOR SELECT TO authenticated USING (true);

-- RLS untuk kelas_mahasiswa (Kaprodi/Admin manage)
DROP POLICY IF EXISTS "kaprodi_manage_kelas_mahasiswa" ON kelas_mahasiswa;
CREATE POLICY "kaprodi_manage_kelas_mahasiswa" ON kelas_mahasiswa
  FOR ALL USING (my_role() IN ('kaprodi', 'admin'));


-- 2. Membuat tabel asesmen_obe (sub-komponen ujian/tugas ke CPMK)
CREATE TABLE IF NOT EXISTS asesmen_obe (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id         UUID REFERENCES rps(id) ON DELETE CASCADE,
  nama_asesmen   TEXT NOT NULL, -- 'uts' | 'uas' | 'tugas' | 'kehadiran' | 'praktikum' | 'lainnya'
  nama_soal      TEXT NOT NULL, -- e.g. 'Soal 1', 'Tugas 1', etc.
  bobot_persen   NUMERIC NOT NULL CHECK (bobot_persen >= 0 AND bobot_persen <= 100), -- persen dari bobot asesmen utama (e.g. 50% dari UTS)
  cpmk_kode      TEXT NOT NULL, -- CPMK-1, CPMK-2, dll.
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rps_id, nama_asesmen, nama_soal)
);

ALTER TABLE asesmen_obe ENABLE ROW LEVEL SECURITY;

-- RLS untuk asesmen_obe: Semua pengguna terautentikasi dapat membaca
DROP POLICY IF EXISTS "auth_read_asesmen_obe" ON asesmen_obe;
CREATE POLICY "auth_read_asesmen_obe" ON asesmen_obe
  FOR SELECT TO authenticated USING (true);

-- RLS untuk asesmen_obe (Dosen terkait & Kaprodi manage)
DROP POLICY IF EXISTS "dosen_manage_asesmen_obe" ON asesmen_obe;
CREATE POLICY "dosen_manage_asesmen_obe" ON asesmen_obe
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rps
      WHERE rps.id = asesmen_obe.rps_id
      AND (rps.dosen_id = auth.uid() OR auth.uid() = ANY(rps.team_dosen) OR my_role() IN ('kaprodi', 'admin'))
    )
  );


-- 3. Membuat tabel nilai_asesmen_mahasiswa (nilai sub-komponen)
CREATE TABLE IF NOT EXISTS nilai_asesmen_mahasiswa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesmen_id     UUID REFERENCES asesmen_obe(id) ON DELETE CASCADE,
  mahasiswa_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nilai          NUMERIC NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (asesmen_id, mahasiswa_id)
);

ALTER TABLE nilai_asesmen_mahasiswa ENABLE ROW LEVEL SECURITY;

-- RLS untuk nilai_asesmen_mahasiswa (SELECT): Pengguna terautentikasi (Dosen, Kaprodi, Admin, atau Mahasiswa ybs)
DROP POLICY IF EXISTS "read_nilai_asesmen" ON nilai_asesmen_mahasiswa;
CREATE POLICY "read_nilai_asesmen" ON nilai_asesmen_mahasiswa
  FOR SELECT USING (
    mahasiswa_id = auth.uid() 
    OR my_role() IN ('dosen', 'kaprodi', 'admin')
  );

-- RLS untuk nilai_asesmen_mahasiswa (Dosen terkait & Kaprodi manage)
DROP POLICY IF EXISTS "dosen_manage_nilai_asesmen" ON nilai_asesmen_mahasiswa;
CREATE POLICY "dosen_manage_nilai_asesmen" ON nilai_asesmen_mahasiswa
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM asesmen_obe
      JOIN rps ON asesmen_obe.rps_id = rps.id
      WHERE asesmen_obe.id = nilai_asesmen_mahasiswa.asesmen_id
      AND (rps.dosen_id = auth.uid() OR auth.uid() = ANY(rps.team_dosen) OR my_role() IN ('kaprodi', 'admin'))
    )
  );


-- 4. SEEDING DATA MAHASISWA DUMMY (Opsional, abaikan jika data user sudah ada)
-- Masukkan user ke auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'mhs.aditya@stikomyos.ac.id', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Aditya Pratama"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'mhs.budi@stikomyos.ac.id', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Budi Santoso"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'mhs.citra@stikomyos.ac.id', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Citra Lestari"}', now(), now(), 'authenticated', 'authenticated', '')
ON CONFLICT (id) DO NOTHING;

-- Update role dan prodi pada profiles untuk user mahasiswa yang baru dibuat
UPDATE public.profiles
SET 
  role = 'mahasiswa', 
  prodi_id = (SELECT id FROM program_studi WHERE kode = 'SI' LIMIT 1)
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
