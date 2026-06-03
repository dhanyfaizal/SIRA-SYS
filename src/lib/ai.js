/**
 * SIRA-SYS — AI Service Integration (Sumopod API)
 * Terkoneksi dengan API Key & URL dari Project WebSlide sebagai default,
 * dengan dukungan BYOK (Bring Your Own Key) via localStorage.
 */

// Model fallback list untuk mengatasi quota exhaustion atau rate limit (HTTP 429)
const MODELS = [
  "deepseek-v4-pro",
  "qwen3.6-plus",
  "glm-5.1",
  "glm-5",
  "deepseek-v4-flash",
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
export async function callAi(prompt, isJson = true) {
  const { apiKey, apiUrl } = getAiConfig();
  let quotaError = null;
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`[SIRASYS AI] Mencoba model ${model}...`);
      
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
          response_format: isJson ? { type: "json_object" } : undefined
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

      const resultText = data.choices?.[0]?.message?.content;
      if (!resultText) throw new Error("Respons AI kosong.");

      // Bersihkan markdown code block jika AI secara tidak sengaja menyertakannya
      const cleanText = resultText.replace(/```json\n?|```/g, '').trim();

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
export async function generateCpmk(courseName, courseDesc, cplList) {
  const prompt = `
    Anda adalah pakar kurikulum Outcome-Based Education (OBE). Berdasarkan data mata kuliah berikut:
    Nama Mata Kuliah: "${courseName}"
    Deskripsi Mata Kuliah: "${courseDesc || 'Mata kuliah umum/keahlian prodi.'}"
    Daftar CPL (Capaian Pembelajaran Lulusan) yang didukung: ${JSON.stringify(cplList)}

    Hasilkan daftar CPMK (Capaian Pembelajaran Mata Kuliah) yang terperinci, terukur, dan OBE-compliant.
    Format output wajib berupa JSON ARRAY murni dari objek CPMK:
    [
      {
        "kode": "CPMK-1",
        "deskripsi": "Mahasiswa mampu menganalisis...",
        "cpl_ref": ["CPL-1", "CPL-2"]
      }
    ]
    
    ATURAN PENTING:
    - Gunakan Bahasa Indonesia formal akademik dengan kata kerja operasional Taksonomi Bloom (C3-C6 seperti menganalisis, mendesain, membuat).
    - Pastikan properti "cpl_ref" berisi array string referensi CPL dari daftar CPL di atas yang relevan (misalnya "CPL-1", "CPL-2"). Gunakan label persis sesuai item CPL dalam array input.
    - Hasilkan minimal 3 dan maksimal 6 CPMK yang komprehensif.
  `;

  return callAi(prompt, true);
}

// 2. Generate 16 Pertemuan mingguan berdasarkan CPMK dan deskripsi mata kuliah
export async function generateWeeklyPlan(courseName, courseDesc, cpmkList) {
  const prompt = `
    Anda adalah perancang instruksional akademik untuk STIKOM Yos Sudarso. Berdasarkan data mata kuliah:
    Nama Mata Kuliah: "${courseName}"
    Deskripsi: "${courseDesc || 'Mata kuliah akademik.'}"
    Daftar CPMK: ${JSON.stringify(cpmkList)}

    Hasilkan draf rencana pembelajaran semester (RPS) lengkap untuk tepat 16 pertemuan.
    
    ATURAN KONTEN PERTEMUAN:
    - Pertemuan 8 WAJIB berupa UTS (is_uts: true, kemampuan_akhir: "Ujian Tengah Semester (UTS)", bahan_kajian: "Evaluasi materi pertemuan 1-7", metode: "Ujian Tertulis / Project", waktu: 150, pengalaman_belajar: "Mengerjakan soal ujian", kriteria_penilaian: "Ketepatan jawaban", bobot: 0, is_uas: false)
    - Pertemuan 16 WAJIB berupa UAS (is_uas: true, kemampuan_akhir: "Ujian Akhir Semester (UAS)", bahan_kajian: "Evaluasi materi pertemuan 9-15", metode: "Ujian Tertulis / Project", waktu: 150, pengalaman_belajar: "Mengerjakan soal ujian akhir atau presentasi project", kriteria_penilaian: "Ketepatan dan kualitas project", bobot: 0, is_uts: false)
    - Pertemuan lainnya (1-7, dan 9-15) harus dirancang secara runut dan logis guna mencapai CPMK yang ada secara bertahap.
    
    Format output harus berupa JSON ARRAY murni berisi tepat 16 objek dengan struktur:
    [
      {
        "no": 1,
        "kemampuan_akhir": "Deskripsi kemampuan akhir mahasiswa minggu ini...",
        "bahan_kajian": "Materi atau topik bahasan...",
        "metode": "Ceramah, Diskusi kelompok",
        "waktu": 150,
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

  return callAi(prompt, true);
}

// 3. Review SPMI kelayakan RPS
export async function reviewSpmi(rpsData) {
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

  return callAi(prompt, true);
}

// 4. Ekstrak Profil Lulusan dan CPL dari dokumen kurikulum
export async function extractCurriculum(text) {
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

  return callAi(prompt, true);
}

// 5. Rekomendasikan CPL yang relevan dari kurikulum program studi berdasarkan Nama Mata Kuliah
export async function generateCplForCourse(courseName, curriculumCpls) {
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

  return callAi(prompt, true);
}

// 6. Generate Deskripsi Mata Kuliah berdasarkan Nama Mata Kuliah
export async function generateCourseDescription(courseName) {
  const prompt = `
    Anda adalah perancang kurikulum pendidikan tinggi. Berdasarkan nama mata kuliah berikut:
    Nama Mata Kuliah: "${courseName}"

    Hasilkan deskripsi mata kuliah yang komprehensif, menarik, dan berstandar akademik tinggi (minimal 100 kata).
    Deskripsi harus menggambarkan fokus utama pembelajaran, relevansi industri/keilmuan, topik-topik kunci yang dicakup, serta kompetensi akhir yang akan dikembangkan oleh mahasiswa setelah menyelesaikan mata kuliah ini.

    Format output harus berupa JSON OBJECT murni dengan struktur:
    {
      "deskripsi": "Isi deskripsi mata kuliah di sini..."
    }

    Gunakan Bahasa Indonesia formal akademik yang profesional dan inspiratif.
    Hasilkan JSON murni tanpa ada penjelasan tambahan di luar JSON.
  `;

  return callAi(prompt, true);
}
