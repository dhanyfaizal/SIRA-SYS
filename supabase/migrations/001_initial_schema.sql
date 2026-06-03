-- ============================================================
-- SIRA-SYS · Migration 001 · Initial Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1. Program Studi ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_studi (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode       TEXT UNIQUE NOT NULL,
  nama       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Profiles (extends auth.users) ─────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap  TEXT NOT NULL,
  nidn          TEXT,
  email         TEXT UNIQUE NOT NULL,
  foto_url      TEXT,
  role          TEXT NOT NULL DEFAULT 'dosen'
                  CHECK (role IN ('admin', 'kaprodi', 'dosen', 'mahasiswa')),
  prodi_id      UUID REFERENCES program_studi(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Mata Kuliah ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mata_kuliah (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prodi_id   UUID REFERENCES program_studi(id) ON DELETE CASCADE,
  kode_mk    TEXT NOT NULL,
  nama_mk    TEXT NOT NULL,
  sks        INTEGER NOT NULL DEFAULT 2,
  semester   INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  cpl        TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (prodi_id, kode_mk)
);

-- ── 4. Penugasan Dosen ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS penugasan_dosen (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dosen_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mk_id          UUID REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  tahun_akademik TEXT NOT NULL,
  semester_aktif TEXT NOT NULL CHECK (semester_aktif IN ('Ganjil', 'Genap')),
  UNIQUE (dosen_id, mk_id, tahun_akademik, semester_aktif)
);

-- ── 5. RPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rps (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mk_id                UUID REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  dosen_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tahun_akademik       TEXT NOT NULL,
  semester_aktif       TEXT NOT NULL CHECK (semester_aktif IN ('Ganjil', 'Genap')),
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'submitted', 'approved', 'revision')),
  deskripsi_mk         TEXT,
  capaian_pembelajaran JSONB DEFAULT '{}',
  rencana_pembelajaran JSONB DEFAULT '[]',
  penilaian            JSONB DEFAULT '{}',
  referensi            TEXT[] DEFAULT '{}',
  public_token         TEXT UNIQUE,
  ai_review_result     JSONB,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rps_updated_at
  BEFORE UPDATE ON rps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Kurikulum Docs (RAG) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS kurikulum_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prodi_id      UUID REFERENCES program_studi(id) ON DELETE CASCADE,
  nama_dokumen  TEXT NOT NULL,
  jenis         TEXT NOT NULL CHECK (jenis IN ('kurikulum','cpl','instrumen_spmi','lainnya')),
  storage_path  TEXT NOT NULL,
  uploaded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 7. Kurikulum Chunks (pgvector RAG) ───────────────────────
CREATE TABLE IF NOT EXISTS kurikulum_chunks (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id    UUID REFERENCES kurikulum_docs(id) ON DELETE CASCADE,
  prodi_id  UUID REFERENCES program_studi(id),
  content   TEXT NOT NULL,
  embedding vector(768),
  metadata  JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON kurikulum_chunks USING hnsw (embedding vector_cosine_ops);

-- ── Helper RLS Functions ──────────────────────────────────────
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION my_prodi_id()
RETURNS UUID AS $$
  SELECT prodi_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── RLS: profiles ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (my_role() = 'admin');

-- ── RLS: rps ─────────────────────────────────────────────────
ALTER TABLE rps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dosen_own_rps" ON rps
  FOR ALL USING (auth.uid() = dosen_id);
CREATE POLICY "kaprodi_see_prodi_rps" ON rps
  FOR SELECT USING (
    my_role() = 'kaprodi'
    AND mk_id IN (SELECT id FROM mata_kuliah WHERE prodi_id = my_prodi_id())
  );
CREATE POLICY "admin_all_rps" ON rps
  FOR ALL USING (my_role() = 'admin');
CREATE POLICY "public_read_rps" ON rps
  FOR SELECT USING (public_token IS NOT NULL);

-- ── RLS: mata_kuliah ──────────────────────────────────────────
ALTER TABLE mata_kuliah ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_prodi_mk" ON mata_kuliah
  FOR SELECT USING (prodi_id = my_prodi_id() OR my_role() = 'admin');
CREATE POLICY "kaprodi_manage_mk" ON mata_kuliah
  FOR ALL USING (my_role() IN ('kaprodi','admin') AND prodi_id = my_prodi_id());

-- ── RLS: kurikulum_chunks ─────────────────────────────────────
ALTER TABLE kurikulum_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prodi_own_chunks" ON kurikulum_chunks
  FOR SELECT USING (prodi_id = my_prodi_id());
CREATE POLICY "kaprodi_insert_chunks" ON kurikulum_chunks
  FOR INSERT WITH CHECK (my_role() = 'kaprodi' AND prodi_id = my_prodi_id());
CREATE POLICY "admin_all_chunks" ON kurikulum_chunks
  FOR ALL USING (my_role() = 'admin');

-- ── Trigger: block non-stikomyos.ac.id ───────────────────────
CREATE OR REPLACE FUNCTION block_non_stikom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@stikomyos.ac.id' THEN
    RAISE EXCEPTION 'Hanya akun @stikomyos.ac.id yang diizinkan masuk ke SIRA-SYS.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger ke auth.users (jalankan sebagai superuser/service_role)
-- CREATE TRIGGER enforce_stikom_domain
--   BEFORE INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION block_non_stikom();

-- ── Trigger: auto-create profile setelah signup ───────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    'dosen'  -- default role; admin ubah sesuai kebutuhan
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
