# SIRA-SYS — Implementation Plan

**Sistem Informasi Rencana Pembelajaran Semester**
STIKOM Yos Sudarso · Tahun Akademik 2025/2026 · Versi 1.0

---

## Ringkasan Eksekutif

SIRA-SYS adalah aplikasi web standalone yang didedikasikan untuk otomatisasi penyusunan, peninjauan, dan dokumentasi Rencana Pembelajaran Semester (RPS) berbasis Outcome-Based Education (OBE) dan Project-Based Learning di lingkungan STIKOM Yos Sudarso.

| Metrik | Nilai |
|--------|-------|
| Total fase | 4 |
| Durasi | 10 minggu |
| Total tugas | 20 |
| Stack utama | Vite + React / Next.js + Supabase |

---

## 1. Pilar Arsitektur

**Autentikasi Terpusat**
Single Sign-On (SSO) Google Workspace yang dibatasi eksklusif untuk domain `@stikomyos.ac.id` guna menjamin keamanan akses.

**Navigasi Multi-Peran (Context-Switcher)**
Mengakomodasi kompleksitas penugasan akademik dengan perpindahan role yang mulus — misalnya dari dashboard manajerial Ka. Prodi DKV ke dashboard operasional dosen pengampu lintas prodi.

**AI Independen & Cerdas (BYOK + RAG)**
Skema Bring Your Own Key (BYOK) untuk efisiensi server, dipadukan dengan Retrieval-Augmented Generation (RAG) yang membaca dokumen kurikulum dan instrumen SPMI untuk memastikan output AI selalu mematuhi standar mutu institusi.

**Pusat Dokumentasi Audit**
Menghasilkan dokumen cetak berstandar (PDF) yang siap menghadapi audit internal maupun eksternal, serta menyediakan akses read-only bagi mahasiswa.

---

## 2. Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vite + React / Next.js |
| Backend & Database | Supabase (PostgreSQL + pgvector) |
| Autentikasi | Google OAuth 2.0 (SSO Workspace) |
| AI & RAG | BYOK API + pgvector embeddings |
| Dokumen | HTML-to-PDF rendering |

---

## 3. Timeline Implementasi

```
W1   W2   W3   W4   W5   W6   W7   W8   W9   W10
[──── Fase 1 ────][──────── Fase 2 ────────][──────── Fase 3 ────────][── Fase 4 ──]
  Fondasi & Keamanan   Builder RPS             AI, RAG & BYOK           Validasi & Rilis
```

| Fase | Minggu | Fokus |
|------|--------|-------|
| Fase 1 | 1–2 | Fondasi Arsitektur & Keamanan |
| Fase 2 | 3–5 | Modul Operasional & Builder RPS |
| Fase 3 | 6–8 | Integrasi AI, RAG & BYOK |
| Fase 4 | 9–10 | Validasi, Pengujian & Rilis |

---

## 4. Rencana Implementasi Per Fase

### Fase 1 · Fondasi Arsitektur & Keamanan
**Minggu 1–2**

Fase ini berfokus pada infrastruktur database, manajemen sesi, dan isolasi data antar program studi. Seluruh komponen keamanan harus selesai dan teruji sebelum fitur operasional dibangun di atasnya.

| Tugas | Deskripsi |
|-------|-----------|
| Inisialisasi proyek | Setup repository frontend dan backend Supabase, konfigurasi environment variabel, CI/CD pipeline dasar |
| Implementasi SSO Google | Konfigurasi Google OAuth 2.0, trigger function Supabase untuk memblokir pendaftaran di luar `@stikomyos.ac.id` |
| Skema database dinamis | Pembuatan tabel relasional: `users`, `roles`, `program_studi`, `mata_kuliah`, `rps` beserta relasi dan constraint |
| Row Level Security (RLS) | Penulisan aturan RLS ketat agar data RPS dan instrumen mutu terisolasi dengan aman antar program studi |
| Context-Switcher UI | Komponen navigasi header untuk perpindahan mode Dosen dan Ka. Prodi secara real-time tanpa re-login |

**Kriteria selesai:** Pengguna dapat login via Google `@stikomyos.ac.id`, akun di luar domain diblokir otomatis, dan perpindahan role berfungsi tanpa kebocoran data antar prodi.

---

### Fase 2 · Modul Operasional & Builder RPS
**Minggu 3–5**

Fase ini membangun mesin utama aplikasi untuk menjamin kelancaran input data manual sebelum integrasi AI. Seluruh alur kerja penyusunan dan distribusi RPS harus dapat berjalan secara penuh tanpa ketergantungan pada komponen AI.

| Tugas | Deskripsi |
|-------|-----------|
| Upload CSV data master | Fitur impor daftar mata kuliah dan pemetaan dosen di awal semester, validasi format dan duplikasi data |
| RPS Form Builder | Antarmuka penyusunan draf RPS (Minggu 1–14, CPL/CPMK, Bahan Kajian, Metode, Bobot Proyek) yang responsif |
| Mesin cetak PDF | Integrasi library konversi HTML ke PDF untuk mencetak RPS final dengan kop surat resmi dan tata letak standar audit |
| Akses mahasiswa read-only | Modul generator tautan publik per mata kuliah yang dapat dibagikan ke mahasiswa tanpa perlu akun |
| Validasi form & UX | Error states, loading indicators, feedback visual untuk semua aksi input |

**Kriteria selesai:** Dosen dapat menyusun RPS lengkap, mencetak PDF berlogo institusi, dan membagikan tautan akses ke mahasiswa. Ka. Prodi dapat melihat daftar RPS seluruh mata kuliah dalam prodinya.

---

### Fase 3 · Integrasi AI, RAG & BYOK
**Minggu 6–8**

Fase injeksi kecerdasan buatan untuk otomatisasi penyusunan dan review standar mutu SPMI. Integrasi AI dirancang modular — jika API key tidak tersedia, seluruh fitur manual pada fase 2 tetap berfungsi penuh.

| Tugas | Deskripsi |
|-------|-----------|
| Manajemen BYOK | Menu pengaturan profil untuk menyimpan API Key secara aman menggunakan enkripsi lokal (`localStorage` / `IndexedDB`) |
| Repositori kurikulum (RAG) | Modul upload dokumen untuk Ka. Prodi, chunking teks kurikulum, penyimpanan ke vector embeddings via `pgvector` |
| Prompt Engineering OBE | Parameter JSON presisi agar AI menarik konteks CPL dari sistem RAG secara otomatis saat membantu dosen menyusun Project-Based Learning |
| Asisten Review SPMI | Alur analisis AI mengevaluasi draf RPS, mencocokkan dengan instrumen penjaminan mutu, output indikator: 🟢 Hijau / 🟡 Kuning / 🔴 Merah |
| Alur generate RPS AI | Antarmuka satu klik untuk generate draf RPS berbasis CPL dan kurikulum, dengan opsi review dan edit manual setelahnya |

**Kriteria selesai:** Ka. Prodi dapat mengunggah dokumen kurikulum ke sistem RAG, dosen dapat menggunakan AI untuk men-generate draf RPS yang sesuai OBE, dan Ka. Prodi mendapatkan indikator kelayakan SPMI otomatis per RPS.

---

### Fase 4 · Validasi, Pengujian & Rilis
**Minggu 9–10**

Pengujian akhir menggunakan data nyata sebelum aplikasi diluncurkan secara penuh. Fase ini memastikan tidak ada celah otorisasi, performa AI memadai, dan pengalaman pengguna telah dioptimalkan.

| Tugas | Deskripsi |
|-------|-----------|
| Pilot project Prodi DKV | Uji coba penuh menggunakan dokumen kurikulum, CPL, dan matriks mata kuliah DKV sebagai data validasi akurasi RAG |
| Pengujian silang role | Memastikan tidak ada bentrok otorisasi saat pengguna yang sama mengelola prodi sekaligus mengajar di prodi lain |
| Optimalisasi UI/UX AI | Perbaikan feedback visual saat AI sedang generate atau review: skeleton loader, progress indicator, pesan error informatif |
| Soft-launch BYOK | Rilis terbatas ke kelompok dosen pilot untuk menguji stabilitas integrasi BYOK dalam kondisi penggunaan nyata |
| Dokumentasi & handover | Panduan penggunaan untuk dosen dan Ka. Prodi, runbook admin Supabase, dan catatan arsitektur sistem |

**Kriteria selesai:** Seluruh pengujian role-crossing lulus tanpa kebocoran, RAG menghasilkan CPL yang sesuai dokumen kurikulum DKV, dan minimal 5 dosen pilot telah menggunakan BYOK tanpa kendala teknis.

---

## 5. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Kualitas dokumen kurikulum yang diunggah ke RAG tidak konsisten | Tinggi | Menyediakan template standar upload dan validasi format sebelum chunking |
| BYOK API key kadaluarsa atau kehabisan kuota | Sedang | Notifikasi proaktif, fallback ke mode manual tanpa AI |
| Pengguna memiliki role ganda yang bentrok | Tinggi | Pengujian silang role intensif di fase 4 dengan skenario nyata |
| Adopsi dosen lambat terhadap fitur AI | Sedang | Soft-launch bertahap, sesi onboarding, dan dokumentasi langkah-per-langkah |
| Performa pgvector melambat seiring volume dokumen | Rendah | Indeksasi HNSW dan monitoring query latency sejak fase 3 |

---

## 6. Kriteria Sukses Go-Live

SIRA-SYS dinyatakan siap untuk rilis penuh apabila seluruh kriteria berikut terpenuhi pada akhir Fase 4:

- SSO Google berfungsi penuh dan memblokir seluruh akun di luar domain `@stikomyos.ac.id`.
- Context-Switcher dapat beralih antar role tanpa celah otorisasi yang terdeteksi dalam pengujian silang.
- Minimal satu RPS lengkap berhasil dicetak dalam format PDF berstandar audit dari setiap program studi pilot.
- Sistem RAG menghasilkan saran CPL yang sesuai dengan dokumen kurikulum yang diunggah dalam lebih dari 85% uji coba.
- Indikator SPMI (Hijau/Kuning/Merah) konsisten dengan penilaian manual Ka. Prodi dalam minimal 80% kasus uji.
- Minimal 5 dosen pilot berhasil menggunakan BYOK selama 3 hari kerja tanpa insiden teknis yang tidak tertangani.
- Mahasiswa dapat mengakses tautan RPS read-only tanpa memerlukan akun atau autentikasi.

---

*Dokumen ini bersifat internal dan diperuntukkan bagi tim pengembang serta pimpinan akademik STIKOM Yos Sudarso.*
*Versi 1.0 · Tahun Akademik 2025/2026*
