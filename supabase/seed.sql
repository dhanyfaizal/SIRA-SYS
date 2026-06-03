-- ============================================================
-- SIRA-SYS · Seed Data
-- Jalankan SETELAH migration 001
-- ============================================================

-- 4 Program Studi STIKOM Yos Sudarso
INSERT INTO program_studi (kode, nama) VALUES
  ('SI',  'Sistem Informasi'),
  ('KA',  'Komputerisasi Akuntansi'),
  ('TI',  'Teknik Informatika'),
  ('DKV', 'Desain Komunikasi Visual')
ON CONFLICT (kode) DO NOTHING;
