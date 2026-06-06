/**
 * SIRA-SYS — Supabase Query Helpers
 * Semua query DB terpusat di sini untuk konsistensi
 */
import { supabase } from './supabase'

// ── Program Studi ──────────────────────────────────────────────
export const dbProdi = {
  getAll: () => supabase.from('program_studi').select('*').order('nama'),
  getById: (id) => supabase.from('program_studi').select('*').eq('id', id).single(),
}

// ── Mata Kuliah ────────────────────────────────────────────────
export const dbMK = {
  getByProdi: (prodiId) =>
    supabase.from('mata_kuliah')
      .select('*')
      .eq('prodi_id', prodiId)
      .order('semester')
      .order('kode_mk'),

  getById: (id) =>
    supabase.from('mata_kuliah')
      .select('*, program_studi(kode, nama)')
      .eq('id', id)
      .single(),

  create: (data) =>
    supabase.from('mata_kuliah').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('mata_kuliah').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('mata_kuliah').delete().eq('id', id),
}

// ── Penugasan Dosen ────────────────────────────────────────────
export const dbPenugasan = {
  getByProdi: (prodiId, tahun, semester) =>
    supabase.from('penugasan_dosen')
      .select(`
        *,
        dosen:dosen_id(id, nama_lengkap, nidn, email),
        mk:mk_id(id, kode_mk, nama_mk, sks, semester)
      `)
      .eq('mk:mk_id.prodi_id', prodiId)
      .eq('tahun_akademik', tahun)
      .eq('semester_aktif', semester),

  getByProdiFlat: (prodiId, tahun, semester) =>
    supabase.from('penugasan_dosen')
      .select(`
        id, tahun_akademik, semester_aktif,
        dosen:profiles!dosen_id(id, nama_lengkap, nidn, email),
        mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, prodi_id)
      `)
      .eq('tahun_akademik', tahun)
      .eq('semester_aktif', semester)
      .filter('mk.prodi_id', 'eq', prodiId),

  getByDosen: (dosenId, tahun, semester) =>
    supabase.from('penugasan_dosen')
      .select(`
        id, tahun_akademik, semester_aktif,
        mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, cpl,
          prodi:program_studi!prodi_id(kode, nama))
      `)
      .eq('dosen_id', dosenId)
      .eq('tahun_akademik', tahun)
      .eq('semester_aktif', semester),

  create: (data) =>
    supabase.from('penugasan_dosen').insert(data).select().single(),

  delete: (id) =>
    supabase.from('penugasan_dosen').delete().eq('id', id),
}

// ── Profiles (Dosen list) ──────────────────────────────────────
export const dbProfiles = {
  getDosenByProdi: (prodiId) =>
    supabase.from('profiles')
      .select('id, nama_lengkap, nidn, email, foto_url')
      .eq('prodi_id', prodiId)
      .in('role', ['dosen', 'kaprodi'])
      .order('nama_lengkap'),

  getAll: () =>
    supabase.from('profiles')
      .select('id, nama_lengkap, nidn, email, role, prodi_id, program_studi(kode,nama)')
      .order('nama_lengkap'),

  update: (id, data) =>
    supabase.from('profiles').update(data).eq('id', id).select().single(),
}

// ── RPS ───────────────────────────────────────────────────────
export const dbRPS = {
  getByDosen: (dosenId) =>
    supabase.from('rps')
      .select(`
        id, status, tahun_akademik, semester_aktif, created_at, updated_at,
        mk:mata_kuliah!mk_id(kode_mk, nama_mk, sks, semester,
          prodi:program_studi!prodi_id(kode, nama))
      `)
      .eq('dosen_id', dosenId)
      .order('updated_at', { ascending: false }),

  getByProdi: (prodiId) =>
    supabase.from('rps')
      .select(`
        id, status, tahun_akademik, semester_aktif, created_at, updated_at,
        dosen:profiles!dosen_id(nama_lengkap, nidn),
        mk:mata_kuliah!mk_id!inner(kode_mk, nama_mk, sks, semester, prodi_id)
      `)
      .eq('mk.prodi_id', prodiId)
      .order('updated_at', { ascending: false }),

  getById: (id) =>
    supabase.from('rps')
      .select(`
        *,
        dosen:profiles!dosen_id(id, nama_lengkap, nidn, email, foto_url),
        mk:mata_kuliah!mk_id(
          id, kode_mk, nama_mk, sks, semester, cpl, prodi_id,
          prodi:program_studi!prodi_id(id, kode, nama)
        )
      `)
      .eq('id', id)
      .single(),

  getByPublicToken: (token) =>
    supabase.from('rps')
      .select(`
        *,
        dosen:profiles!dosen_id(nama_lengkap, nidn),
        mk:mata_kuliah!mk_id(kode_mk, nama_mk, sks, semester, cpl, prodi_id,
          prodi:program_studi!prodi_id(id, kode, nama))
      `)
      .eq('public_token', token)
      .single(),

  create: (data) =>
    supabase.from('rps').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('rps').update(data).eq('id', id).select().single(),

  updateStatus: (id, status) =>
    supabase.from('rps').update({ status }).eq('id', id),

  generateToken: (id) => {
    const token = `rps-${id.slice(0,8)}-${Date.now().toString(36)}`
    return supabase.from('rps').update({ public_token: token }).eq('id', id).select('public_token').single()
  },

  delete: (id) =>
    supabase.from('rps').delete().eq('id', id),
}

// ── Utils ──────────────────────────────────────────────────────
export const TAHUN_AKADEMIK_LIST = (() => {
  const now = new Date()
  const yr  = now.getFullYear()
  return [`${yr-1}/${yr}`, `${yr}/${yr+1}`, `${yr+1}/${yr+2}`]
})()

export const SEMESTER_LIST = ['Ganjil', 'Genap']

export const currentTahunAkademik = () => {
  const now = new Date()
  const yr  = now.getFullYear()
  const sem = now.getMonth() < 6 ? 'Genap' : 'Ganjil'
  const ta  = sem === 'Ganjil' ? `${yr}/${yr+1}` : `${yr-1}/${yr}`
  return { tahun: ta, semester: sem }
}

// ── Comments ──────────────────────────────────────────────────
export const dbComments = {
  getByRps: (rpsId) =>
    supabase.from('rps_comments')
      .select(`
        *,
        user:profiles!user_id(id, nama_lengkap, email, role, foto_url)
      `)
      .eq('rps_id', rpsId)
      .order('created_at', { ascending: true }),

  create: (data) =>
    supabase.from('rps_comments').insert(data).select().single(),

  delete: (id) =>
    supabase.from('rps_comments').delete().eq('id', id),
}

// ── Notifications ──────────────────────────────────────────────
export const dbNotifications = {
  getAll: (userId) =>
    supabase.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

  getUnreadCount: async (userId) => {
    const { count, error } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    return { count: count || 0, error }
  },

  markAsRead: (id) =>
    supabase.from('notifications').update({ is_read: true }).eq('id', id),

  markAllAsRead: (userId) =>
    supabase.from('notifications').update({ is_read: true }).eq('user_id', userId),

  create: (userId, title, message, link) =>
    supabase.from('notifications').insert({ user_id: userId, title, message, link }),
}

// ── Review RPS ────────────────────────────────────────────────
export const dbReviewRps = {
  /** Ambil review terbaru untuk satu RPS */
  getLatestByRpsId: (rpsId) =>
    supabase.from('rps_reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, nama_lengkap, nidn)
      `)
      .eq('rps_id', rpsId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

  /** Ambil semua riwayat review untuk satu RPS */
  getAllByRpsId: (rpsId) =>
    supabase.from('rps_reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, nama_lengkap, nidn)
      `)
      .eq('rps_id', rpsId)
      .order('created_at', { ascending: false }),

  /** Ambil review terbaru untuk semua RPS approved di prodi (untuk daftar) */
  getByProdi: (prodiId) =>
    supabase.from('rps_reviews')
      .select(`
        id, rps_id, reviewer_id, created_at, updated_at,
        a_cpmk_subcpmk,
        b1_identitas_mk, b2_penanggung_jawab, b3_cpl_cpmk, b4_deskripsi_mk,
        b5_bahan_kajian, b6_referensi, b7_media_pembelajaran, b8_prasyarat, b9_komposisi,
        c1_minggu_ke, c2_kemampuan_akhir, c3_bahan_kajian_rps, c4_metode_pembelajaran,
        c5_waktu, c6_pengalaman_belajar, c7_kriteria_penilaian, c8_bobot_nilai, c9_referensi_rps,
        rekomendasi,
        reviewer:profiles!reviewer_id(nama_lengkap),
        rps:rps!rps_id(
          id, mk_id, dosen_id, status,
          mk:mata_kuliah!mk_id(prodi_id)
        )
      `)
      .eq('rps.mk.prodi_id', prodiId)
      .order('created_at', { ascending: false }),

  /** Buat review baru */
  create: (data) =>
    supabase.from('rps_reviews').insert(data).select().single(),

  /** Update review yang sudah ada */
  update: (id, data) =>
    supabase.from('rps_reviews').update(data).eq('id', id).select().single(),
}
