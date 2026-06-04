-- ============================================================
-- SIRA-SYS · Migration 006 · Modul Review RPS (Blanko Review)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel rps_reviews — menyimpan riwayat review RPS oleh Ka. Prodi
--    Tidak UNIQUE pada rps_id agar bisa menyimpan semua riwayat review
CREATE TABLE IF NOT EXISTS rps_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id       UUID REFERENCES rps(id) ON DELETE CASCADE,
  reviewer_id  UUID REFERENCES profiles(id),

  -- ══════════════════════════════════════════════════════════════
  -- A. Peta Capaian Pembelajaran (1 sub-aspek)
  -- ══════════════════════════════════════════════════════════════
  a_cpmk_subcpmk          TEXT CHECK (a_cpmk_subcpmk IN ('sesuai','cukup','tidak_sesuai')),
  a_cpmk_subcpmk_catatan  TEXT,

  -- ══════════════════════════════════════════════════════════════
  -- B. Profil Mata Kuliah (9 sub-aspek)
  -- ══════════════════════════════════════════════════════════════
  b1_identitas_mk              TEXT CHECK (b1_identitas_mk IN ('sesuai','cukup','tidak_sesuai')),
  b1_identitas_mk_catatan      TEXT,

  b2_penanggung_jawab          TEXT CHECK (b2_penanggung_jawab IN ('sesuai','cukup','tidak_sesuai')),
  b2_penanggung_jawab_catatan  TEXT,

  b3_cpl_cpmk                  TEXT CHECK (b3_cpl_cpmk IN ('sesuai','cukup','tidak_sesuai')),
  b3_cpl_cpmk_catatan          TEXT,

  b4_deskripsi_mk              TEXT CHECK (b4_deskripsi_mk IN ('sesuai','cukup','tidak_sesuai')),
  b4_deskripsi_mk_catatan      TEXT,

  b5_bahan_kajian              TEXT CHECK (b5_bahan_kajian IN ('sesuai','cukup','tidak_sesuai')),
  b5_bahan_kajian_catatan      TEXT,

  b6_referensi                 TEXT CHECK (b6_referensi IN ('sesuai','cukup','tidak_sesuai')),
  b6_referensi_catatan         TEXT,

  b7_media_pembelajaran        TEXT CHECK (b7_media_pembelajaran IN ('sesuai','cukup','tidak_sesuai')),
  b7_media_pembelajaran_catatan TEXT,

  b8_prasyarat                 TEXT CHECK (b8_prasyarat IN ('sesuai','cukup','tidak_sesuai')),
  b8_prasyarat_catatan         TEXT,

  b9_komposisi                 TEXT CHECK (b9_komposisi IN ('sesuai','cukup','tidak_sesuai')),
  b9_komposisi_catatan         TEXT,

  -- ══════════════════════════════════════════════════════════════
  -- C. Rencana Pembelajaran Semester (9 sub-aspek)
  -- ══════════════════════════════════════════════════════════════
  c1_minggu_ke                 TEXT CHECK (c1_minggu_ke IN ('sesuai','cukup','tidak_sesuai')),
  c1_minggu_ke_catatan         TEXT,

  c2_kemampuan_akhir           TEXT CHECK (c2_kemampuan_akhir IN ('sesuai','cukup','tidak_sesuai')),
  c2_kemampuan_akhir_catatan   TEXT,

  c3_bahan_kajian_rps          TEXT CHECK (c3_bahan_kajian_rps IN ('sesuai','cukup','tidak_sesuai')),
  c3_bahan_kajian_rps_catatan  TEXT,

  c4_metode_pembelajaran       TEXT CHECK (c4_metode_pembelajaran IN ('sesuai','cukup','tidak_sesuai')),
  c4_metode_pembelajaran_catatan TEXT,

  c5_waktu                     TEXT CHECK (c5_waktu IN ('sesuai','cukup','tidak_sesuai')),
  c5_waktu_catatan             TEXT,

  c6_pengalaman_belajar        TEXT CHECK (c6_pengalaman_belajar IN ('sesuai','cukup','tidak_sesuai')),
  c6_pengalaman_belajar_catatan TEXT,

  c7_kriteria_penilaian        TEXT CHECK (c7_kriteria_penilaian IN ('sesuai','cukup','tidak_sesuai')),
  c7_kriteria_penilaian_catatan TEXT,

  c8_bobot_nilai               TEXT CHECK (c8_bobot_nilai IN ('sesuai','cukup','tidak_sesuai')),
  c8_bobot_nilai_catatan       TEXT,

  c9_referensi_rps             TEXT CHECK (c9_referensi_rps IN ('sesuai','cukup','tidak_sesuai')),
  c9_referensi_rps_catatan     TEXT,

  -- ══════════════════════════════════════════════════════════════
  -- Rekomendasi umum
  -- ══════════════════════════════════════════════════════════════
  rekomendasi                  TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index pada rps_id untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_rps_reviews_rps_id ON rps_reviews (rps_id);

-- Auto-update updated_at
CREATE TRIGGER rps_reviews_updated_at
  BEFORE UPDATE ON rps_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── RLS Policies ──────────────────────────────────────────────

ALTER TABLE rps_reviews ENABLE ROW LEVEL SECURITY;

-- Kaprodi: full CRUD pada review RPS di prodi mereka
DROP POLICY IF EXISTS "kaprodi_manage_rps_reviews" ON rps_reviews;
CREATE POLICY "kaprodi_manage_rps_reviews" ON rps_reviews
  FOR ALL USING (
    my_role() = 'kaprodi'
    AND EXISTS (
      SELECT 1 FROM rps
      JOIN mata_kuliah mk ON rps.mk_id = mk.id
      WHERE rps.id = rps_reviews.rps_id
      AND mk.prodi_id = my_prodi_id()
    )
  );

-- Dosen: read-only pada review RPS milik mereka
DROP POLICY IF EXISTS "dosen_read_own_rps_reviews" ON rps_reviews;
CREATE POLICY "dosen_read_own_rps_reviews" ON rps_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rps
      WHERE rps.id = rps_reviews.rps_id
      AND (rps.dosen_id = auth.uid() OR auth.uid() = ANY(rps.team_dosen))
    )
  );

-- Admin: full access
DROP POLICY IF EXISTS "admin_all_rps_reviews" ON rps_reviews;
CREATE POLICY "admin_all_rps_reviews" ON rps_reviews
  FOR ALL USING (my_role() = 'admin');
