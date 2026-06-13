/**
 * SIRA-SYS — AI Service Integration (Sumopod API)
 * Terkoneksi dengan API Key & URL dari Project WebSlide sebagai default,
 * dengan dukungan BYOK (Bring Your Own Key) via localStorage.
 */

// Model fallback list untuk mengatasi quota exhaustion atau rate limit (HTTP 429)
const MODELS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "qwen3.6-plus",
  "glm-5.1",
  "glm-5",
  "qwen3.6-flash",
  "glm-5-turbo"
];

// Mendapatkan konfigurasi API (dari localStorage jika ada, fallback ke env, atau default WebSlide)
export function getAiConfig() {
  const localKey = localStorage.getItem('sirasys_ai_key');
  const localUrl = localStorage.getItem('sirasys_ai_url');

  const apiKey = localKey || import.meta.env.VITE_SUMOPOD_API_KEY || 'sk-4eU68ckHgBeC5OoZwiK1ng';
  const apiUrl = localUrl || import.meta.env.VITE_SUMOPOD_API_URL || 'https://ai.sumopod.com/v1';

  return {
    apiKey,
    apiUrl,
    isCustom: !!(localKey || localUrl)
  };
}

// Menyimpan konfigurasi API ke localStorage
export function saveAiConfig(key, url) {
  if (key) localStorage.setItem('sirasys_ai_key', key.trim());
  else localStorage.removeItem('sirasys_ai_key');

  if (url) localStorage.setItem('sirasys_ai_url', url.trim());
  else localStorage.removeItem('sirasys_ai_url');
}

// Mereset konfigurasi AI ke default
export function resetAiConfig() {
  localStorage.removeItem('sirasys_ai_key');
  localStorage.removeItem('sirasys_ai_url');
}

// Inti pemanggilan API dengan fallback otomatis
export async function callAi(prompt, isJson = true, onProgress = null) {
  const { apiKey, apiUrl } = getAiConfig();
  let quotaError = null;
  let lastError = null;

  if (onProgress) {
    onProgress("Menghubungi Gateway API Server...");
  }

  for (const model of MODELS) {
    try {
      if (onProgress) {
        if (model !== MODELS[0]) {
          onProgress("Model utama sibuk, beralih ke model cadangan...");
        } else {
          onProgress("Mengirim data materi & rujukan RPS ke server...");
        }
      }
      console.log(`[SIRASYS AI] Mencoba model ${model}...`);
      
      if (onProgress) {
        onProgress("AI sedang memikirkan materi & merumuskan konten (proses ini memakan waktu)...");
      }

      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          response_format: isJson ? { type: "json_object" } : undefined,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        if (onProgress) {
          onProgress("Membaca data respon...");
        }
        const data = await response.json();
        if (data?.error) {
          throw new Error(data.error.message || JSON.stringify(data.error));
        }
        const resultText = data.choices?.[0]?.message?.content;
        if (!resultText) throw new Error("Respons AI kosong.");
        const cleanText = resultText.replace(/```json\n?|```/g, '').trim();
        return isJson ? JSON.parse(cleanText) : cleanText;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";

      if (onProgress) {
        onProgress("Koneksi berhasil! Mulai mengunduh stream data dari AI...");
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (!cleanedLine) continue;
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const dataObj = JSON.parse(dataStr);
              const content = dataObj.choices?.[0]?.delta?.content || "";
              accumulatedText += content;

              if (onProgress) {
                onProgress({
                  type: 'chunk',
                  text: accumulatedText
                });
              }
            } catch (e) {
              // Abaikan parsing error parsial pada stream
            }
          }
        }
      }

      if (onProgress) {
        onProgress("Mendekode & memvalidasi struktur JSON...");
      }

      const cleanText = accumulatedText.replace(/```json\n?|```/g, '').trim();
      if (!cleanText) throw new Error("Respons stream AI kosong.");

      if (onProgress) {
        onProgress("Memverifikasi kelayakan format materi...");
      }

      return isJson ? JSON.parse(cleanText) : cleanText;
    } catch (err) {
      lastError = err;
      const errMsg = String(err.message || '').toLowerCase();
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('exhausted')) {
        quotaError = err;
      }
      console.warn(`[SIRASYS AI Fallback] Kegagalan pada model ${model}:`, err);
    }
  }

  const finalError = quotaError || lastError;
  const finalMessage = finalError?.message || (typeof finalError === 'string' ? finalError : 'Koneksi gagal.');
  throw new Error(`Semua model AI gagal merespon: ${finalMessage}`);
}

// Uji koneksi kunci API tertentu
export async function testConnection(key, url) {
  const testUrl = url || 'https://ai.sumopod.com/v1';
  const testKey = key;
  
  if (!testKey) throw new Error("API Key tidak boleh kosong.");

  // Gunakan model flash yang cepat untuk pengujian
  const response = await fetch(`${testUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testKey}`
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: 'user', content: "Katakan 'OK' jika terhubung." }],
      max_tokens: 10
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data?.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  return true;
}

// 1. Generate CPMK berdasarkan CPL dan deskripsi mata kuliah
export async function generateCpmk(courseName, courseDesc, cplList, onProgress = null) {
  const prompt = `
    Anda adalah pakar kurikulum Outcome-Based Education (OBE). Berdasarkan data mata kuliah berikut:
    Nama Mata Kuliah: "${courseName}"
    Deskripsi Mata Kuliah: "${courseDesc || 'Mata kuliah umum/keahlian prodi.'}"
    Daftar CPL (Capaian Pembelajaran Lulusan) yang didukung: ${JSON.stringify(cplList || [])}

    Hasilkan daftar CPMK (Capaian Pembelajaran Mata Kuliah) yang terperinci, terukur, dan OBE-compliant.
    Format output wajib berupa JSON ARRAY murni dari objek CPMK:
    [
      {
        "kode": "CPMK-1",
        "deskripsi": "Mahasiswa mampu menganalisis...",
        "cpl_ref": ["CPL-4", "CPL-5"]
      }
    ]
    
    ATURAN PENTING:
    - Gunakan Bahasa Indonesia formal akademik dengan kata kerja operasional Taksonomi Bloom (C3-C6 seperti menganalisis, mendesain, membuat).
    - Properti "cpl_ref" wajib berisi array string kode CPL (misalnya ["CPL-4", "CPL-5"]) yang relevan dengan CPMK tersebut.
    - HANYA gunakan kode CPL yang ada di dalam daftar CPL yang didukung di atas (contoh: jika input hanya memiliki CPL-4, CPL-5, CPL-6, CPL-12, maka "cpl_ref" hanya boleh berisi kode-kode tersebut. Jangan pernah menuliskan "CPL-1", "CPL-2", dll jika tidak ada di daftar input di atas).
    - Hasilkan minimal 3 dan maksimal 6 CPMK yang komprehensif.
  `;

  return callAi(prompt, true, onProgress);
}

// 2. Generate 16 Pertemuan mingguan berdasarkan CPMK dan deskripsi mata kuliah
export async function generateWeeklyPlan(courseName, courseDesc, cpmkList, sks = 3, references = [], onProgress = null) {
  const targetWaktu = (Number(sks) || 3) * 50;
  const prompt = `
    Anda adalah perancang instruksional akademik untuk STIKOM Yos Sudarso. Berdasarkan data mata kuliah:
    Nama Mata Kuliah: "${courseName}"
    Deskripsi: "${courseDesc || 'Mata kuliah akademik.'}"
    Daftar CPMK: ${JSON.stringify(cpmkList)}
    Daftar Referensi Pustaka yang Tersedia: ${JSON.stringify(references)}

    Hasilkan draf rencana pembelajaran semester (RPS) lengkap untuk tepat 16 pertemuan.
    
    ATURAN KONTEN PERTEMUAN:
    - Pertemuan 8 WAJIB berupa UTS (is_uts: true, kemampuan_akhir: "Ujian Tengah Semester (UTS)", bahan_kajian: "Evaluasi materi pertemuan 1-7", metode: "Ujian Tertulis / Project", waktu: ${targetWaktu}, pengalaman_belajar: "Mengerjakan soal ujian", kriteria_penilaian: "Ketepatan jawaban", bobot: 0, is_uas: false)
    - Pertemuan 16 WAJIB berupa UAS (is_uas: true, kemampuan_akhir: "Ujian Akhir Semester (UAS)", bahan_kajian: "Evaluasi materi pertemuan 9-15", metode: "Ujian Tertulis / Project", waktu: ${targetWaktu}, pengalaman_belajar: "Mengerjakan soal ujian akhir atau presentasi project", kriteria_penilaian: "Ketepatan dan kualitas project", bobot: 0, is_uts: false)
    - Pertemuan lainnya (1-7, dan 9-15) harus dirancang secara runut dan logis guna mencapai CPMK yang ada secara bertahap.
    - Untuk setiap pertemuan (selain UTS dan UAS), Anda WAJIB mencantumkan kode sitasi referensi yang dirujuk dari Daftar Referensi Pustaka yang Tersedia di atas pada akhir kolom bahan_kajian atau di deskripsi pengalaman belajar (misalnya: "Rujukan: [1]" atau "Referensi: [2]"). Hubungkan topik minggu tersebut secara akurat dengan buku atau artikel ilmiah yang relevan di daftar referensi.
    
    Format output harus berupa JSON ARRAY murni berisi tepat 16 objek dengan struktur:
    [
      {
        "no": 1,
        "kemampuan_akhir": "Deskripsi kemampuan akhir mahasiswa minggu ini...",
        "bahan_kajian": "Materi atau topik bahasan... Rujukan: [1]",
        "metode": "Ceramah, Diskusi kelompok",
        "waktu": ${targetWaktu},
        "pengalaman_belajar": "Mahasiswa mendiskusikan studi kasus...",
        "kriteria_penilaian": "Ketepatan penjelasan dan kedalaman argumen...",
        "bobot": 5,
        "is_uts": false,
        "is_uas": false
      },
      ...
    ]
    
    ATURAN FORMATTING & BOBOT:
    - Gunakan Bahasa Indonesia yang baik dan benar.
    - Bobot untuk setiap pertemuan di luar UTS (minggu 8) dan UAS (minggu 16) sebaiknya berkisar antara 5 s.d. 8 (total bobot seluruh minggu non-evaluasi disarankan berjumlah 80%, karena sisa 20% dialokasikan secara dinamis).
    - Hasilkan draf lengkap tanpa memotong respons.
  `;

  return callAi(prompt, true, onProgress);
}

// 3. Review SPMI kelayakan RPS
export async function reviewSpmi(rpsData, onProgress = null) {
  const prompt = `
    Anda adalah auditor Sistem Penjaminan Mutu Internal (SPMI) perguruan tinggi STIKOM Yos Sudarso.
    Tugas Anda adalah mengevaluasi dokumen Rencana Pembelajaran Semester (RPS) berikut untuk menilai keselarasan instruksional (constructive alignment):
    
    - Mata Kuliah: ${rpsData.mk?.nama_mk || 'Mata Kuliah'}
    - Deskripsi: ${rpsData.deskripsi_mk || 'Tidak ada deskripsi.'}
    - CPMK: ${JSON.stringify(rpsData.capaian_pembelajaran?.cpmk || [])}
    - Rencana Pembelajaran (16 Pertemuan): ${JSON.stringify(rpsData.rencana_pembelajaran || [])}
    - Penilaian: ${JSON.stringify(rpsData.penilaian || {})}
    - Referensi: ${JSON.stringify(rpsData.referensi || [])}

    Lakukan analisis mendalam terhadap:
    1. Apakah CPMK sudah selaras dengan CPL yang diacu.
    2. Apakah materi pada 16 pertemuan mencakup seluruh CPMK secara adekuat.
    3. Apakah metode evaluasi (Penilaian) relevan untuk mengukur CPMK.
    4. Kelayakan referensi yang dicantumkan.

    Tentukan status kelayakan dengan ketentuan berikut:
    - "GREEN" jika RPS memiliki keselarasan instruksional yang sangat baik dan memenuhi standar mutu.
    - "YELLOW" jika ada kekurangan minor (seperti bobot penilaian kurang seimbang, materi kurang detail, atau referensi terlalu tua).
    - "RED" jika ada kesalahan fatal (seperti CPMK tidak nyambung dengan materi, tidak ada asesmen yang relevan, atau pertemuan tidak lengkap).

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "status": "GREEN" | "YELLOW" | "RED",
      "score": 0 - 100,
      "summary": "Ringkasan audit penjaminan mutu secara umum...",
      "recommendations": [
        "Rekomendasi perbaikan 1...",
        "Rekomendasi perbaikan 2..."
      ]
    }
    
    Gunakan Bahasa Indonesia yang ramah namun kritis dan berstandar akademik tinggi.
  `;

  return callAi(prompt, true, onProgress);
}

// 4. Ekstrak Profil Lulusan dan CPL dari dokumen kurikulum
export async function extractCurriculum(text, onProgress = null) {
  const prompt = `
    Anda adalah pakar kurikulum Outcome-Based Education (OBE). Tugas Anda adalah menganalisis dokumen kurikulum berikut dan mengekstrak:
    1. Profil Lulusan (PL) yang berisi peran/profil dan deskripsi singkatnya.
    2. Capaian Pembelajaran Lulusan (CPL) yang berisi kode (CPL-1, CPL-2, dst) dan deskripsi capaiannya.

    Konten Teks Kurikulum:
    """
    ${text}
    """

    Hasilkan output dalam format JSON OBJECT murni dengan struktur persis seperti ini:
    {
      "profil_lulusan": [
        {
          "kode": "PL-1",
          "profil": "Software Developer",
          "deskripsi": "Mampu mengembangkan aplikasi skala enterprise..."
        }
      ],
      "cpl": [
        {
          "kode": "CPL-1",
          "deskripsi": "Mampu merancang sistem perangkat lunak yang aman dan efisien..."
        }
      ]
    }

    ATURAN PENTING:
    - Ekstrak semua Profil Lulusan dan CPL yang tertulis di dalam dokumen.
    - Jika teks dokumen tidak menyebutkan kode CPL secara eksplisit, generate kode secara berurutan seperti CPL-1, CPL-2, dst. Hal yang sama berlaku untuk Profil Lulusan (PL-1, PL-2, dst).
    - Gunakan Bahasa Indonesia formal akademik.
    - Hasilkan JSON murni tanpa ada penjelasan tambahan di luar JSON.
  `;

  return callAi(prompt, true, onProgress);
}

// 5. Rekomendasikan CPL yang relevan dari kurikulum program studi berdasarkan Nama Mata Kuliah
export async function generateCplForCourse(courseName, curriculumCpls, onProgress = null) {
  const prompt = `
    Anda adalah pakar kurikulum Outcome-Based Education (OBE). Tugas Anda adalah memilih/merekomendasikan CPL (Capaian Pembelajaran Lulusan) mana saja yang relevan dari daftar CPL program studi yang tersedia untuk mata kuliah berikut:
    
    Nama Mata Kuliah: "${courseName}"

    Daftar CPL Program Studi:
    ${JSON.stringify(curriculumCpls)}

    Hasilkan daftar CPL terpilih dalam bentuk JSON ARRAY murni yang berisi KODE CPL terpilih (misalnya ["CPL-1", "CPL-3"]):
    [
      "CPL-1",
      "CPL-3"
    ]

    ATURAN PENTING:
    - Hanya pilih KODE CPL dari daftar CPL Program Studi di atas yang benar-benar relevan dengan pembelajaran mata kuliah "${courseName}".
    - Jangan membuat kode CPL baru yang tidak ada di daftar CPL Program Studi di atas.
    - Hasilkan JSON ARRAY murni tanpa ada penjelasan tambahan di luar JSON.
  `;

  return callAi(prompt, true, onProgress);
}

// 6. Generate Deskripsi Mata Kuliah berdasarkan Nama Mata Kuliah
export async function generateCourseDescription(courseName, onProgress = null, keywords = '') {
  const prompt = `
    Anda adalah perancang kurikulum pendidikan tinggi. Berdasarkan nama mata kuliah berikut:
    Nama Mata Kuliah: "${courseName}"
    ${keywords.trim() ? `Fokus Topik / Kata Kunci Tambahan: "${keywords.trim()}"` : ''}

    Hasilkan deskripsi mata kuliah yang komprehensif, menarik, dan berstandar akademik tinggi (minimal 100 kata).
    Deskripsi harus menggambarkan fokus utama pembelajaran, relevansi industri/keilmuan, topik-topik kunci yang dicakup, serta kompetensi akhir yang akan dikembangkan oleh mahasiswa setelah menyelesaikan mata kuliah ini.
    ${keywords.trim() ? 'PENTING: Integrasikan fokus topik / kata kunci tambahan yang diberikan di atas secara alami ke dalam deskripsi mata kuliah sebagai bagian utama dari materi pokok atau teknologi/konsep yang dipelajari.' : ''}

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "deskripsi": "Isi deskripsi mata kuliah di sini..."
    }

    Gunakan Bahasa Indonesia formal akademik yang profesional dan inspiratif.
    Hasilkan JSON murni tanpa ada penjelasan tambahan di luar JSON.
  `;

  return callAi(prompt, true, onProgress);
}

// 7. Review RPS Lengkap Berdasarkan 19 Aspek Blanko Review
export async function reviewRpsFull(rpsData, onProgress = null) {
  const prompt = `
    Anda adalah auditor dan asesor akademik perguruan tinggi STIKOM Yos Sudarso.
    Tugas Anda adalah meninjau (review) dokumen Rencana Pembelajaran Semester (RPS) berikut secara mendalam terhadap 19 aspek evaluasi standardisasi kurikulum perguruan tinggi.

    Data RPS yang akan ditinjau:
    - Nama Mata Kuliah: "${rpsData.mk?.nama_mk || '—'}"
    - Kode MK: "${rpsData.mk?.kode_mk || '—'}"
    - SKS: ${rpsData.mk?.sks || 0}
    - Semester: ${rpsData.mk?.semester || 0}
    - Program Studi: "${rpsData.mk?.prodi?.nama || '—'}"
    - Dosen Pengampu: "${rpsData.dosen?.nama_lengkap || '—'}" (NIDN: "${rpsData.dosen?.nidn || '—'}")
    - Koordinator MK / Penanggung Jawab: "${rpsData.koordinator_mk?.nama_lengkap || '—'}" (NIDN: "${rpsData.koordinator_mk?.nidn || '—'}")
    - Ketua Program Studi (Kaprodi): "${rpsData.kaprodi?.nama_lengkap || '—'}" (NIDN: "${rpsData.kaprodi?.nidn || '—'}")
    - Tanggal Penyusunan: "${rpsData.tanggal_penyusunan || '—'}"
    - Deskripsi MK: "${rpsData.deskripsi_mk || '—'}"
    - CPL yang Dibebankan: ${JSON.stringify(rpsData.capaian_pembelajaran?.cpl || [])}
    - CPMK: ${JSON.stringify(rpsData.capaian_pembelajaran?.cpmk || [])}
    - Media Pembelajaran (Perangkat Lunak & Perangkat Keras): ${JSON.stringify(rpsData.media_pembelajaran || {})}
    - Mata Kuliah Prasyarat: "${rpsData.prasyarat || '—'}"
    - Rencana Pembelajaran (16 Pertemuan): ${JSON.stringify(rpsData.rencana_pembelajaran || [])}
    - Penilaian/Asesmen: ${JSON.stringify(rpsData.penilaian || {})}
    - Referensi: ${JSON.stringify(rpsData.referensi || [])}

    ATURAN EVALUASI & STANDAR RATING:
    - b2_penanggung_jawab: Berikan rating "sesuai" jika terdapat informasi Dosen Pengampu, Koordinator MK / Penanggung Jawab, Ketua Program Studi (Kaprodi), dan Tanggal Penyusunan. Semua data ini sudah tertera lengkap di input.
    - b7_media_pembelajaran: Berikan rating "sesuai" jika tertera media berupa Perangkat Lunak dan Perangkat Keras yang spesifik dan relevan dengan jenis mata kuliah (DKV/Teknologi/Komputer menggunakan aplikasi desain/pemrograman, sedangkan kelas umum memakai software office/LMS). Semua media yang diinput sudah disesuaikan secara dinamis dan layak, sehingga rating aspek ini harus bernilai "sesuai".
    - b8_prasyarat: Berikan rating "sesuai" karena kejelasan prasyarat (baik tertulis mata kuliah prasyarat tertentu seperti Gambar 2, Dasar Pemrograman, atau dinyatakan "tidak ada prasyarat khusus") sudah terdefinisi secara teratur untuk MK ini.
    - c8_bobot_nilai: Berikan rating "sesuai" jika total bobot dari rencana pembelajaran 16 pertemuan berjumlah tepat 100% dan bobot UTS (pertemuan 8) serta UAS (pertemuan 16) sinkron dengan bobot Penilaian/Asesmen utama (misal UTS: 25% dan UAS: 25%). Sistem kami telah menyinkronkan bobot ini secara matematis, sehingga rating aspek ini harus dinilai "sesuai".

    Lakukan ulasan analitis deskriptif kritis terhadap 19 aspek berikut. Untuk masing-masing aspek, tentukan:
    1. Rating: Wajib bernilai "sesuai", "cukup", atau "tidak_sesuai".
    2. Catatan: Penjelasan deskriptif ringkas dalam Bahasa Indonesia (maksimal 2 kalimat) mengapa rating tersebut diberikan dan saran perbaikan yang spesifik jika ada.

    19 Aspek Evaluasi:
    A. Peta Capaian Pembelajaran:
       1. a_cpmk_subcpmk: Kesesuaian CPMK dan Sub-CPMK dengan CPL yang dibebankan pada mata kuliah.
    B. Profil Mata Kuliah:
       2. b1_identitas_mk: Kelengkapan Kode MK, nama MK, SKS, semester, dan program studi.
       3. b2_penanggung_jawab: Keberadaan dosen pengampu, penanggung jawab, Kaprodi, dan tanggal penyusunan.
       4. b3_cpl_cpmk: CPL-Prodi yang dibebankan dan CPMK yang didefinisikan dengan jelas.
       5. b4_deskripsi_mk: Deskripsi singkat mata kuliah menggambarkan ringkasan materi.
       6. b5_bahan_kajian: Kelayakan bahan kajian atau kedalaman materi pembelajaran.
       7. b6_referensi: Daftar pustaka/referensi lengkap, mutakhir (10 tahun terakhir jika memungkinkan), dan relevan.
       8. b7_media_pembelajaran: Media software (perangkat lunak) dan hardware (perangkat keras) pendukung.
       9. b8_prasyarat: Kejelasan prasyarat mata kuliah (jika ada).
       10. b9_komposisi: Kesesuaian komposisi teori dan praktek mata kuliah.
    C. Rencana Pembelajaran Semester (RPS) Mingguan:
       11. c1_minggu_ke: Rencana 16 pertemuan lengkap (minggu 1-16).
       12. c2_kemampuan_akhir: Rumusan kemampuan akhir mahasiswa per pertemuan yang terukur.
       13. c3_bahan_kajian_rps: Materi ajar per pertemuan selaras dengan kemampuan akhir.
       14. c4_metode_pembelajaran: Metode belajar (ceramah, diskusi, PBL, case study) aktif dan relevan.
       15. c5_waktu: Alokasi waktu per pertemuan logis (misal 50 menit x SKS per minggu).
       16. c6_pengalaman_belajar: Deskripsi bentuk aktivitas/pengalaman belajar mahasiswa yang konkret.
       17. c7_kriteria_penilaian: Indikator dan kriteria penilaian per pertemuan yang jelas.
       18. c8_bobot_nilai: Penentuan bobot nilai evaluasi per pertemuan (sesuai tingkat kesulitan).
       19. c9_referensi_rps: Referensi yang ditunjuk per pertemuan relevan.

    Rekomendasi Umum:
    Berikan satu rekomendasi umum (1 paragraf) untuk keseluruhan kelayakan RPS ini.

    Format Respons Wajib berupa JSON Object dengan struktur:
    {
      "a_cpmk_subcpmk": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b1_identitas_mk": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b2_penanggung_jawab": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b3_cpl_cpmk": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b4_deskripsi_mk": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b5_bahan_kajian": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b6_referensi": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b7_media_pembelajaran": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b8_prasyarat": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "b9_komposisi": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c1_minggu_ke": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c2_kemampuan_akhir": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c3_bahan_kajian_rps": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c4_metode_pembelajaran": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c5_waktu": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c6_pengalaman_belajar": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c7_kriteria_penilaian": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c8_bobot_nilai": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "c9_referensi_rps": { "rating": "sesuai"|"cukup"|"tidak_sesuai", "catatan": "..." },
      "rekomendasi": "Catatan ulasan and kesimpulan rekomendasi umum secara ringkas..."
    }

    PENTING: Hanya kembalikan JSON Object murni tanpa teks pengantar maupun penutup.
  `;

  return callAi(prompt, true, onProgress);
}

// 8. Hasilkan Laporan Naratif Deskriptif Kompilasi
export async function generateCompilationReport(prodiName, coursesData, stats, onProgress = null) {
  const prompt = `
    Anda adalah asesor dan auditor akademik senior di Sekolah Tinggi Ilmu Komputer Yos Sudarso.
    Tugas Anda adalah menyusun Laporan Hasil Evaluasi dan Kompilasi Review Rencana Pembelajaran Semester (RPS) untuk Program Studi "${prodiName}".

    Berikut adalah data kompilasi review RPS dari beberapa mata kuliah yang telah dievaluasi:
    - Jumlah Mata Kuliah Terkompilasi: ${coursesData.length} MK
    - Daftar MK & Catatan Review Asesor:
    ${coursesData.map(c => `
      * MK: ${c.nama_mk} (${c.kode_mk})
        - Dosen: ${c.dosen_nama}
        - Catatan Reviewer: ${c.rekomendasi || '—'}
        - Skor Evaluasi Aspek: Sesuai: ${c.sesuai}, Cukup: ${c.cukup}, Tidak Sesuai: ${c.tidak_sesuai}
    `).join('\n')}

    - Statistik Kepatuhan Aspek (%) dari Total MK yang Terpilih:
    ${Object.entries(stats).map(([key, val]) => `
      * Aspek [${key}]: Sesuai ${val.sesuai_pct}%, Cukup ${val.cukup_pct}%, Tidak Sesuai ${val.tidak_sesuai_pct}%
    `).join('\n')}

    Susunlah ulasan Laporan Analisa Deskriptif Hasil Evaluasi RPS tingkat Program Studi. Laporan harus sangat profesional, terstruktur, kritis, konstruktif, dan menggunakan Bahasa Indonesia akademik formal.
    Struktur ulasan laporan wajib dibagi menjadi 3 bagian utama menggunakan format Markdown:
    1. **ANALISIS KEKUATAN & KEPATUHAN (Strengths)**:
       Tinjau aspek-aspek mana yang memiliki kepatuhan paling tinggi (persentase "Sesuai" mendekati 100%) dan jelaskan mengapa hal itu berdampak positif terhadap kualitas pembelajaran di program studi.
    2. **ANALISIS KELEMAHAN & AREA REVISI (Areas for Improvement)**:
       Identifikasi aspek-aspek yang paling banyak mendapat rating "Cukup" atau "Tidak Sesuai" di seluruh mata kuliah. Tentukan akar masalah atau kelemahan dominan yang perlu diperbaiki.
    3. **RENCANA TINDAK LANJUT & REKOMENDASI PRODI (Action Plan)**:
       Berikan langkah taktis konkret yang harus diambil oleh Kaprodi dan Dosen Pengampu untuk meningkatkan mutu RPS pada semester ini (misalnya: lokakarya penyelarasan CPMK, revisi referensi, atau sinkronisasi instrumen penilaian).

    Kembalikan hasil dalam format teks Markdown akademik yang siap dicetak/disalin. Jangan sertakan teks pengantar maupun penutup di luar isi laporan.
  `;

  return callAi(prompt, false, onProgress);
}

// 9. Generate Referensi Pustaka berdasarkan Nama Mata Kuliah dan CPMK
export async function generateReferences(courseName, cpmkList, onProgress = null) {
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 3
  const prompt = `
    Anda adalah pakar akademis dan pustakawan universitas. Berdasarkan data mata kuliah berikut:
    Nama Mata Kuliah: "${courseName}"
    CPMK (Capaian Pembelajaran Mata Kuliah): ${JSON.stringify(cpmkList || [])}

    Hasilkan rekomendasi referensi pustaka yang sangat relevan dan mutakhir dalam rentang waktu 3 tahun terakhir (${startYear}-${currentYear}).
    Rekomendasi harus terdiri dari 2 kategori utama:
    1. Buku Teks (Textbook) 3 Tahun Terakhir (${startYear}-${currentYear})
    2. Artikel Ilmiah / Jurnal Ilmiah 3 Tahun Terakhir (${startYear}-${currentYear})

    Pastikan referensi yang diberikan:
    - Sangat relevan dengan materi pembelajaran untuk mencapai CPMK di atas.
    - Ditulis dalam format sitasi akademik standar (APA Style).
    - Memiliki tahun terbit antara ${startYear} dan ${currentYear} (inklusif).

    Format output harus berupa JSON ARRAY murni yang berisi string daftar referensi langsung:
    [
      "Nama Penulis. (Tahun). Judul Buku. Penerbit.",
      "Nama Penulis. (Tahun). Judul Artikel. Nama Jurnal, Volume(Isi), Halaman."
    ]
    
    Hasilkan minimal 4 dan maksimal 6 referensi gabungan yang paling representatif dan berkualitas.
    Hanya kembalikan JSON array murni tanpa ada penjelasan tambahan di luar JSON.
  `

  return callAi(prompt, true, onProgress)
}

// 10. Generate Rekomendasi Pemetaan Asesmen OBE
export async function generateObeMapping(courseName, cpmkList, assessmentComponents, onProgress = null) {
  const prompt = `
    Anda adalah pakar kurikulum Outcome-Based Education (OBE) tingkat tinggi.
    Tugas Anda adalah merancang konfigurasi pemetaan sub-komponen asesmen/soal ke Capaian Pembelajaran Mata Kuliah (CPMK) untuk mata kuliah berikut:
    
    Nama Mata Kuliah: "${courseName}"
    Daftar CPMK: ${JSON.stringify(cpmkList)}
    Komponen Asesmen & Bobot Utama: ${JSON.stringify(assessmentComponents)}

    Untuk setiap komponen asesmen utama (seperti 'uts', 'uas', 'tugas', dll.) yang memiliki bobot > 0, rancanglah daftar sub-komponen soal yang logis, lengkap, dan mencakup semua CPMK secara merata.
    
    ATURAN PEMETAAN:
    1. Total bobot_persen sub-komponen di bawah komponen utama tertentu WAJIB berjumlah tepat 100%. Contoh, jika komponen utama adalah 'uts' (dengan bobot MK 30%), Anda dapat merekomendasikan:
       - Soal 1 (CPMK-1, bobot 50% dari UTS)
       - Soal 2 (CPMK-2, bobot 50% dari UTS)
       (total bobot_persen Soal 1 dan Soal 2 = 100).
    2. Pemetaan CPMK ke sub-komponen soal harus logis dan sesuai dengan deskripsi CPMK.
    3. Nama asesmen (nama_asesmen) dalam sub-komponen hasil rekomendasi harus disesuaikan dengan jenis komponen utama: 'uts', 'uas', 'tugas', 'praktikum', 'kehadiran', atau 'lainnya'.
    4. Cukup rekomendasikan 1 s.d. 4 sub-komponen per kategori asesmen utama, pastikan distribusinya menutupi semua CPMK yang didefinisikan.

    Format respons WAJIB berupa JSON ARRAY murni dari objek sub-komponen dengan struktur:
    [
      {
        "nama_asesmen": "uts" | "uas" | "tugas" | "praktikum" | "kehadiran" | "lainnya",
        "nama_soal": "Soal 1: ...",
        "cpmk_kode": "CPMK-1",
        "bobot_persen": 50
      }
    ]

    Jangan berikan penjelasan tambahan apapun, hanya kembalikan JSON array murni.
  `

  return callAi(prompt, true, onProgress)
}

// 11. Generate Materi Slide untuk Pertemuan (Format Outline Sederhana)
export async function generateSlideContent(courseName, meetingNo, topic, capability, references = [], semester = 1, sks = 3, onProgress = null) {
  const isSenior = semester >= 5;
  const targetWaktu = sks * 50;

  const prompt = `
    Anda adalah pakar akademis dan desainer instruksional senior. Tugas Anda adalah menyusun rancangan materi ajar dalam bentuk outline slide presentasi terstruktur berbasis Outcome-Based Education (OBE) untuk perkuliahan berikut:
    Mata Kuliah: "${courseName}"
    Semester: ${semester} (Tingkat: ${isSenior ? 'Lanjut/Akhir - fokus pada studi kasus industri nyata, sintesis, & proyek mandiri' : 'Awal/Dasar - fokus pada teori fondasional, konsep utama, & contoh dasar'})
    SKS: ${sks} SKS (Alokasi waktu tatap muka: ${targetWaktu} menit)
    Pertemuan Ke: ${meetingNo}
    Topik / Bahan Kajian: "${topic || '—'}"
    Kemampuan Akhir Mahasiswa: "${capability || '—'}"
    Referensi Pustaka Utama RPS: ${JSON.stringify(references)}

    Hasilkan outline slide presentasi yang sangat komprehensif, mendalam, dan terstruktur dengan ketentuan alur (workflow) berikut:

    Fase 1: Pemetaan Tujuan (Alignment) & Karakteristik Mahasiswa
    - Sesuaikan kedalaman materi dengan tingkat semester (${semester}).
    - ${isSenior ? 'Karena mahasiswa berada di tingkat akhir (semester >= 5), berikan porsi lebih besar pada studi kasus industri nyata, proyek mandiri, dan sintesis konsep.' : 'Karena mahasiswa berada di tingkat awal/menengah (semester < 5), fokuskan pada teori dasar, terminologi, konsep fondasional, serta contoh terstruktur.'}

    Fase 2: Strukturisasi Materi (Outline) & Section Divider
    - Pembagian Topik: Pecah topik bahasan menjadi beberapa topik bahasan utama yang logis.
    - Slide Pembatas Topik (Section Divider): Setiap kali masuk ke topik bahasan baru, Anda WAJIB membuat satu slide transisi khusus (Section Divider) yang berfungsi sebagai pembatas. Slide ini ditandai dengan properti "is_section": true, dan hanya memuat judul topik bahasan tersebut (tanpa poin-poin panjang).
    - Slide Lanjutan (Continuation): Materi/topik bahasan yang kompleks diperbolehkan (dan disarankan) dijelaskan menggunakan 2 atau 3 slide berturut-turut. Pada slide ke-2 dan ke-3 dari topik yang sama, tambahkan tulisan " (Lanjutan)" atau " (Bagian 2)" / " (Bagian 3)" pada judul slide tersebut agar mahasiswa memahami kelanjutan materinya.
    - Pembagian Estimasi Waktu: Tentukan estimasi waktu pengerjaan/pembelajaran untuk setiap slide/sub-topik (alokasikan secara proporsional dari total waktu ${targetWaktu} menit).

    Fase 3: Pengembangan Konten Interaktif & Visual (Termasuk 5 Slide Kuis Mandiri)
    - Kurasi pustaka: Integrasikan referensi pustaka utama RPS di atas yang relevan (cantumkan rujukan buku/artikel pada slide yang sesuai).
    - Berikan visualisasi data/perbandingan dalam bentuk tabel atau bagan perbandingan di salah dari slide tengah.
    - Sediakan setidaknya 1 slide multimedia yang memerlukan gambar visual penjelas (sediakan deskripsi kata kunci bahasa Inggris sederhana untuk 'unsplash_query' yang akan digunakan untuk mencari gambar dari Unsplash, Pexels, atau Pixabay).
    - Kuis Interaktif Dedikatif (5 Slide Kuis Mandiri): Kuis ini diletakkan SETELAH slide Kesimpulan/Sintesis dan SEBELUM slide Penugasan/Aktivitas Kelas. Anda WAJIB menyusun TEPAT 5 slide kuis pilihan ganda terpisah secara berurutan (Kuis 1 s.d. Kuis 5). Setiap kuis harus menempati 1 slide-nya sendiri. Setiap slide kuis harus memiliki properti "quiz" yang berisi 1 pertanyaan kuis pilihan ganda dengan 5 pilihan jawaban (A, B, C, D, E), kunci jawaban, serta penjelasan/pembahasan singkat yang mendalam.

    Fase 4: Desain Aktivitas Kelas & Evaluasi (Active Learning)
    - Diskusi Kelas & Tanya Jawab: Rancang slide interaktif khusus Diskusi Kelas & Tanya Jawab tepat setelah akhir slide Konten Materi (sebelum Kesimpulan). Slide ini berisi beberapa pertanyaan pemantik diskusi interaktif.
    - Sintesis/Kesimpulan: Slide kesimpulan akhir dan keterkaitan topik ini dengan materi minggu lalu/minggu depan. Slide ini diletakkan tepat setelah slide Diskusi Kelas & Tanya Jawab dan sebelum 5 Slide Kuis Mandiri.
    - Penugasan Praktis & Aktivitas Kelas: Rancang aktivitas belajar aktif di dalam kelas (seperti FGD, Case Study, Mini-Sprint) ATAU penugasan praktis yang relevan. Slide ini diletakkan tepat setelah 5 Slide Kuis Mandiri (sebelum slide Terima Kasih).

    Urutan Slide yang WAJIB dipatuhi secara berurutan:
    1. Slide Cover / Judul Utama Presentasi (Slide 1)
    2. Slide Konten Materi (minimal 35 slide, diselingi Section Divider / transisi topik baru jika ada)
    3. Slide Diskusi Kelas & Tanya Jawab (berisi pertanyaan pemantik diskusi interaktif)
    4. Slide Kesimpulan & Sintesis
    5. 5 Slide Kuis Mandiri (Kuis 1 s.d. Kuis 5 berurutan secara terpisah)
    6. Slide Penugasan & Aktivitas Kelas (FGD / Case Study / Assignment)
    (Slide Terima Kasih akan ditambahkan secara otomatis oleh sistem, jadi Anda tidak perlu membuatnya).

    Ketentuan Slide:
    1. Jumlah Slide Konten Materi: Wajib menghasilkan minimal 35 slide (dan maksimal 45 slide jika diperlukan) yang MURNI berisi konten materi/sub-topik perkuliahan saja. Jumlah ini di luar/tidak termasuk:
       - Slide Cover Utama (Slide 1)
       - Slide Pembatas Topik (Section Divider/Transition)
       - Slide Diskusi Kelas & Tanya Jawab
       - Slide Kesimpulan/Sintesis
       - 5 Slide Kuis Mandiri
       - Slide Aktivitas Belajar Aktif (FGD/Case Study) & Penugasan
       (Dengan demikian, total keseluruhan slide presentasi jika digabung dapat mencapai sekitar 45 hingga 55 slide).
    2. Struktur Slide: Poin penjelasan pada setiap slide materi harus berupa kalimat informatif yang kaya konten, memberikan contoh konkret, perbandingan, atau studi kasus nyata. Hindari poin-poin yang terlalu pendek atau ringkasan seadanya.

    PENTING: Jangan pernah memasukkan teks referensi (seperti "REFERENSI: ...") atau nama dosen/placeholder dosen (seperti "DOSEN: ...") ke dalam properti "title" dari outline utama.

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "title": "Judul Utama Presentasi",
      "slides": [
        {
          "slide_no": 1,
          "title": "Judul Slide",
          "is_section": false, // true jika slide ini adalah pembatas/transisi topik baru
          "estimated_time": 5, // dalam menit
          "content": [
            "Poin penjelasan mendalam..." // kosongkan atau beri deskripsi singkat jika is_section = true
          ],
          "unsplash_query": "kata kunci gambar di unsplash jika slide ini membutuhkan gambar pendukung (opsional, gunakan bahasa inggris)",
          "quiz": { // WAJIB ada dan hanya diisi pada tepat 5 slide kuis di bagian akhir presentasi
            "question": "Pertanyaan kuis...",
            "options": [
              "Opsi A: deskripsi opsi A...",
              "Opsi B: deskripsi opsi B...",
              "Opsi C: deskripsi opsi C...",
              "Opsi D: deskripsi opsi D...",
              "Opsi E: deskripsi opsi E..."
            ],
            "answer": "A/B/C/D/E",
            "explanation": "Penjelasan jawaban..."
          },
          "activity": { // hanya untuk slide aktivitas/tugas (opsional)
            "type": "FGD" | "Case Study" | "Mini-Sprint" | "Assignment",
            "instruction": "Instruksi aktivitas atau tugas..."
          }
        },
        ...
      ]
    }

    Jangan sertakan teks pengantar maupun penutup di luar JSON murni.
  `;

  return callAi(prompt, true, onProgress);
}

export async function generateWebSlideData(courseName, prodiName, meetingNo, outlineData, onProgress = null) {
  const prompt = `
    Anda adalah pakar akademis dan desainer instruksional senior. Tugas Anda adalah menerjemahkan outline materi perkuliahan berikut menjadi presentasi WebSlide terstruktur dan interaktif dengan tata letak (layout) dinamis:
    Mata Kuliah: "${courseName}"
    Program Studi: "${prodiName}"
    Pertemuan Ke: ${meetingNo}
    
    Data Outline Materi (JSON):
    ${JSON.stringify(outlineData)}

    Berdasarkan data outline di atas, buatlah presentasi WebSlide lengkap yang memetakan seluruh slide dari outline (antara 45 s.d. 60 slide secara keseluruhan). Untuk setiap slide dari outline, analisis materinya secara mendalam dan tentukan tipe tata letak (layout) yang paling sesuai, variatif, dan profesional agar presentasi interaktif dan tidak monoton.

    ATURAN LAYOUT YANG HARUS DIPILIH:
    Setiap objek slide dapat memuat properti opsional "reference": "Nama Penulis & Tahun (contoh: Williams & Park, 2023)" apabila slide tersebut memuat kutipan/rujukan teoretis.

    1. "cover": Hanya untuk Slide 1 (Cover utama perkuliahan).
       PENTING: Jangan pernah memasukkan daftar referensi (seperti "REFERENSI: ...") atau nama dosen/placeholder dosen (seperti "DOSEN: ...") ke dalam properti title, subtitle, atau description dari cover slide. Informasi dosen pengampu akan ditangani secara terpisah oleh sistem.
       {
         "slide_no": 1,
         "layout": "cover",
         "title": "Judul Cover",
         "subtitle": "Subjudul cover",
         "description": "Deskripsi singkat isi perkuliahan hari ini"
       }
    1b. "section": Slide pembatas/transisi topik baru (Section Divider). Wajib digunakan jika slide pada outline memiliki "is_section": true.
       {
         "slide_no": X,
         "layout": "section",
         "title": "Judul Topik Baru",
         "description": "Deskripsi singkat sub-topik bahasan ini (opsional)"
       }
    2. "split": Layout 2 kolom (kiri & kanan). Cth: konsep/masalah di kiri, poin detail di kanan.
       {
         "slide_no": X,
         "layout": "split",
         "title": "Judul Slide",
         "reference": "...",
         "split_left": {
           "heading": "Judul kolom kiri (cth: Masalah/Definisi)",
           "description": "Penjelasan teoritis mendalam atau kutipan besar di kolom kiri..."
         },
         "split_right": [
           "Poin detail 1...",
           "Poin detail 2...",
           "Poin detail 3..."
         ]
       }
    3. "grid": Layout grid kartu (2, 3, atau 4 kartu). Cocok untuk menguraikan beberapa kategori, pilar, atau komponen utama.
       {
         "slide_no": X,
         "layout": "grid",
         "title": "Judul Slide",
         "reference": "...",
         "grid_items": [
           { "title": "Nama Kategori 1", "desc": "Deskripsi...", "icon": "fa-solid fa-lightbulb" },
           { "title": "Nama Kategori 2", "desc": "Deskripsi...", "icon": "fa-solid fa-code" }
         ]
       }
       Gunakan FontAwesome class yang relevan untuk "icon" (cth: fa-solid fa-gears, fa-solid fa-shield-halved, fa-solid fa-database, fa-solid fa-book, dll.).
    4. "list": Layout daftar kartu berurutan. Masing-masing item dibungkus dengan kartu beraksen tepi kiri berwarna.
       {
         "slide_no": X,
         "layout": "list",
         "title": "Judul Slide",
         "reference": "...",
         "list_items": [
           { "text": "Pernyataan/langkah/poin penting 1...", "color": "red" },
           { "text": "Pernyataan/langkah/poin penting 2...", "color": "amber" }
         ]
       }
       Properti "color" wajib bernilai salah satu dari "red", "amber", "green", atau "blue".
    5. "table": Layout tabel perbandingan. Sangat baik jika membandingkan dua teknologi, konsep, atau kelebihan & kekurangan.
       {
         "slide_no": X,
         "layout": "table",
         "title": "Judul Slide",
         "reference": "...",
         "table_data": {
           "headers": ["Aspek Perbandingan", "Konsep A", "Konsep B"],
           "rows": [
             ["Definisi", "Penjelasan A...", "Penjelasan B..."],
             ["Kelebihan", "Kelebihan A...", "Kelebihan B..."]
           ]
         }
       }
    6. "accordion": Layout akordion interaktif (Tanya Jawab / Diskusi Kelas / Sub-Materi).
       Gunakan layout "accordion" untuk slide "Diskusi Kelas & Tanya Jawab" yang diletakkan setelah akhir slide Konten Materi (sebelum Kesimpulan) agar interaktif.
       {
         "slide_no": X,
         "layout": "accordion",
         "title": "Diskusi Kelas & Tanya Jawab",
         "reference": "...",
         "accordion_items": [
           { "header": "Pertanyaan pemantik / Judul sub-konsep 1?", "content": "Pembahasan substantif / jawaban ilmiah yang komprehensif atas pertanyaan tersebut..." },
           { "header": "Pertanyaan pemantik / Judul sub-konsep 2?", "content": "Analisis kasus / penjelasan mendalam..." }
         ]
       }
    7. "image": Layout slide dengan visual gambar pendukung. Menampilkan gambar di kiri (berdasarkan query pencarian) dan poin penjelasan di kanan. Cocok untuk slide yang memerlukan demonstrasi visual/multimedia.
       {
         "slide_no": X,
         "layout": "image",
         "title": "Judul Slide",
         "reference": "...",
         "unsplash_query": "kata kunci gambar dalam bahasa inggris (misal: 'programming', 'network', 'data') untuk mencari gambar dari Unsplash, Pexels, atau Pixabay",
         "content": [
           "Poin penjelasan visual 1...",
           "Poin penjelasan visual 2..."
         ]
       }
    8. "quiz": Layout kuis interaktif pilihan ganda di akhir materi presentasi untuk mengukur pemahaman.
       {
         "slide_no": X,
         "layout": "quiz",
         "title": "Kuis Interaktif: Uji Pemahaman",
         "quiz": {
           "question": "Pertanyaan kuis pilihan ganda...",
           "options": [
             "Opsi A: deskripsi opsi A...",
             "Opsi B: deskripsi opsi B...",
             "Opsi C: deskripsi opsi C...",
             "Opsi D: deskripsi opsi D...",
             "Opsi E: deskripsi opsi E..."
           ],
           "answer": "A" | "B" | "C" | "D" | "E",
           "explanation": "Penjelasan detail kenapa jawaban tersebut benar..."
         }
       }

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "title": "Judul Utama Presentasi",
      "slides": [
        // Daftar slide di sini sesuai skema di atas
      ]
    }

    Aturan Urutan Tata Letak (Layout) Slide:
    1. Slide 1 (Cover Utama): Gunakan layout "cover".
    2. Slide Konten Materi (dengan/tanpa Section Divider):
       - Gunakan layout "section" untuk slide pembatas/transisi topik baru (jika outlineData memiliki "is_section": true).
       - Gunakan layout variatif seperti "split", "grid", "list", "table", "image", atau "accordion" untuk konten materi standard.
    3. Slide Diskusi Kelas & Tanya Jawab: Gunakan layout "accordion". Slide ini diletakkan tepat setelah slide Konten Materi terakhir (sebelum Kesimpulan).
    4. Slide Kesimpulan / Sintesis: Gunakan layout deskriptif seperti "list", "split", atau fallback standard.
    5. 5 Slide Kuis Mandiri: Gunakan layout "quiz" berturut-turut untuk 5 kuis dari outlineData.
    6. Slide Penugasan & Aktivitas Kelas: Gunakan layout dengan properti "activity" yang sesuai (seperti layout "split" atau "list" beraksen biru/hijau untuk penugasan/aktivitas).

    Aturan Umum:
    - Gunakan Bahasa Indonesia formal akademik yang kaya konten dan berwawasan ilmiah tinggi.
    - HINDARI memberikan meta-instruksi, arahan presentasi, atau instruksi lisan bagi presenter/dosen (seperti "Ajak mahasiswa...", "Jelaskan...", "Tekankan...", "Tunjukkan contoh...", dll.). Konten harus langsung berupa penjelasan materi, pembahasan teoritis, jawaban konkret, atau data ilmiah yang ditujukan untuk audiens/mahasiswa.
    - GLOSARIUM: Apabila sebuah slide memuat istilah asing, istilah ilmiah/teknis khusus yang mungkin tidak umum bagi mahasiswa (misalnya visual clutter, whitespace, grid system, hierarchy, dll.), wajib menyisipkan satu slide berikutnya yang secara khusus menjelaskan/mendefinisikan arti istilah tersebut menggunakan layout yang sesuai (seperti split, list, atau accordion).
    - FORMATTING: Gunakan tag HTML <strong> untuk mencetak tebal kata kunci atau poin-poin inti dari penjelasan agar memudahkan audiens menangkap poin penting dengan cepat. Gunakan tag HTML <em> untuk mencetak miring istilah asing, istilah teknis, atau istilah tidak umum.
    - Jangan berikan penjelasan tambahan apapun di luar JSON murni.
  `;

  return callAi(prompt, true, onProgress);
}

// 12. Generate Soal Ujian Essay untuk UTS/UAS
export async function generateEssayQuestions(courseName, examType, topic, capability, onProgress = null) {
  const prompt = `
    Anda adalah dosen senior dan pakar evaluasi akademik. Tugas Anda adalah membuat soal ujian dalam bentuk Essay (soal uraian) untuk evaluasi perkuliahan berikut:
    Mata Kuliah: "${courseName}"
    Jenis Evaluasi: "${examType}" (UTS / UAS)
    Topik Utama: "${topic || 'Evaluasi pembelajaran'}"
    Kemampuan Akhir / CPMK Terkait: "${capability || 'Mengukur pemahaman materi perkuliahan'}"

    Hasilkan daftar soal essay (minimal 3 soal, maksimal 5 soal) yang berkualitas tinggi, bertipe HOTS (Higher Order Thinking Skills), analitis, dan aplikatif.
    Setiap soal harus dilengkapi dengan bobot skor maksimal (total bobot seluruh soal harus 100) dan rubrik kriteria penilaian singkat untuk memudahkan koreksi.

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "title": "Soal Ujian Essay ${examType} - ${courseName}",
      "questions": [
        {
          "no": 1,
          "question": "Pertanyaan essay nomor 1 yang analitis...",
          "max_score": 25,
          "rubric": "Rubrik penilaian: Skor 25 jika mahasiswa menjelaskan konsep A, B, C dengan sangat lengkap dan memberikan contoh kasus nyata. Skor 10-20 jika penjelasan cukup lengkap tapi tidak ada contoh. Skor <10 jika jawaban tidak relevan."
        },
        ...
      ]
    }

    ATURAN:
    - Gunakan Bahasa Indonesia formal akademik yang jelas dan tidak ambigu.
    - Jumlah max_score dari seluruh soal wajib berjumlah tepat 100.
    - Jangan berikan penjelasan tambahan apapun di luar JSON murni.
  `;

  return callAi(prompt, true, onProgress);
}


