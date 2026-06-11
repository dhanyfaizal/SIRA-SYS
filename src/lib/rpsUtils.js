/**
 * Utility functions for RPS dynamic content and alignment.
 */

export function getDynamicMedia(courseName, prodiName) {
  const name = courseName?.trim() || '';
  const prodi = prodiName?.toLowerCase() || '';
  const lowerName = name.toLowerCase();

  let software = '';
  let hardware = '';

  if (prodi.includes('desain komunikasi visual') || prodi.includes('dkv') || 
      lowerName.includes('desain') || lowerName.includes('gambar') || lowerName.includes('visual') ||
      lowerName.includes('animasi') || lowerName.includes('3d') || lowerName.includes('multimedia') ||
      lowerName.includes('augmented reality') || lowerName.includes('virtual reality') || lowerName.includes('game')) {
    
    software = 'Adobe Creative Suite (Photoshop, Illustrator, Premiere), Blender 3D, Unity Engine, Vuforia SDK, Windows/macOS';
    hardware = 'PC/Laptop (Spesifikasi Grafis Tinggi/Core i7, RAM 16GB, GPU Nvidia), Pen Tablet/Drawing Tablet, Smartphone (AR-Compatible), LCD Proyektor, Whiteboard';
  } else if (prodi.includes('sistem informasi') || prodi.includes('informatika') || prodi.includes('komputer') ||
             lowerName.includes('pemrograman') || lowerName.includes('database') || lowerName.includes('web') ||
             lowerName.includes('jaringan') || lowerName.includes('cloud') || lowerName.includes('rpl') || lowerName.includes('data')) {
    
    software = 'IDE (VS Code, Android Studio, Visual Studio), DBMS (PostgreSQL, MySQL, Supabase), Git/GitHub, Web Browser (Chrome/Firefox), OS (Windows/Linux/macOS)';
    hardware = 'Laptop/PC (RAM minimal 8GB, SSD), Router/Switch (untuk praktek jaringan), LCD Proyektor, Koneksi Internet, Whiteboard';
  } else {
    software = 'Windows/macOS, MS Office (Word, PowerPoint, Excel), PDF Reader, Google Classroom / LMS Sekolah Tinggi';
    hardware = 'Laptop/PC, LCD Proyektor, Koneksi Internet, Whiteboard';
  }

  return { software, hardware };
}

export function getDynamicPrasyarat(courseName, prodiName) {
  const name = courseName?.trim() || '';
  const prodi = prodiName?.toLowerCase() || '';

  // 1. Check if course ends with Roman numerals or Arabic numbers
  const romanMatch = name.match(/^(.*?)\s+(II|III|IV|V)$/i);
  if (romanMatch) {
    const base = romanMatch[1];
    const num = romanMatch[2].toUpperCase();
    let prev = 'I';
    if (num === 'III') prev = 'II';
    if (num === 'IV') prev = 'III';
    if (num === 'V') prev = 'IV';
    return `${base} ${prev}`;
  }

  const numMatch = name.match(/^(.*?)\s+(\d+)$/);
  if (numMatch) {
    const base = numMatch[1];
    const num = parseInt(numMatch[2], 10);
    if (num > 1) {
      return `${base} ${num - 1}`;
    }
  }

  // 2. Mapping based on course names
  const lowerName = name.toLowerCase();
  if (lowerName.includes('augmented reality') || lowerName.includes('virtual reality') || lowerName.includes('game')) {
    return 'Pemrograman Berorientasi Objek / Grafika Komputer';
  }
  if (lowerName.includes('skripsi') || lowerName.includes('tugas akhir')) {
    return 'Metodologi Penelitian & Seminar';
  }
  if (lowerName.includes('pemrograman web')) {
    return 'Dasar Pemrograman';
  }
  if (lowerName.includes('struktur data')) {
    return 'Algoritma & Pemrograman';
  }
  if (lowerName.includes('grafika komputer')) {
    return 'Matematika Diskrit / Aljabar Linier';
  }
  if (lowerName.includes('rekayasa perangkat lunak')) {
    return 'Analisis & Perancangan Sistem';
  }
  if (lowerName.includes('keamanan informasi') || lowerName.includes('keamanan jaringan')) {
    return 'Jaringan Komputer';
  }
  if (lowerName.includes('data mining') || lowerName.includes('kecerdasan buatan') || lowerName.includes('machine learning')) {
    return 'Statistika / Basis Data';
  }
  if (lowerName.includes('desain komunikasi visual') || lowerName.includes('dkv')) {
    if (lowerName.includes('2') || lowerName.includes('ii')) return 'Desain Komunikasi Visual I';
    return 'Rupa Dasar / Nirmana';
  }
  if (lowerName.includes('gambar') && (lowerName.includes('bentuk') || lowerName.includes('anatomi'))) {
    return 'Menggambar Dasar';
  }

  // 3. Prodi-based default
  if (prodi.includes('desain komunikasi visual') || prodi.includes('dkv')) {
    return 'Nirmana 2D / Menggambar Dasar';
  }
  if (prodi.includes('sistem informasi') || prodi.includes('informatika') || prodi.includes('komputer')) {
    return 'Dasar-Dasar Pemrograman';
  }

  return 'Tidak ada prasyarat wajib (mengikuti ketentuan kurikulum prodi)';
}

export function distributeWeeklyBobot(pertemuanList, penilaian) {
  if (!Array.isArray(pertemuanList)) return [];
  
  const utsWeight = Number(penilaian?.uts || 0);
  const uasWeight = Number(penilaian?.uas || 0);
  const totalNonExam = 100 - utsWeight - uasWeight;
  
  const baseWeight = Math.floor(totalNonExam / 14);
  const remainder = totalNonExam % 14;
  
  return pertemuanList.map((p, idx) => {
    if (idx === 7) { // Week 8
      return { ...p, bobot: utsWeight, is_uts: true, is_uas: false };
    }
    if (idx === 15) { // Week 16
      return { ...p, bobot: uasWeight, is_uts: false, is_uas: true };
    }
    // Determine non-exam index
    let nonExamIdx = idx;
    if (idx > 7) nonExamIdx = idx - 1; // skip week 8
    
    const extra = nonExamIdx < remainder ? 1 : 0;
    return { ...p, bobot: baseWeight + extra, is_uts: false, is_uas: false };
  });
}
