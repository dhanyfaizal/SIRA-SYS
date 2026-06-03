const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database tables for Fase 3...');

  // Test kelas_mahasiswa
  const { data: kelas, error: errorKelas } = await supabase
    .from('kelas_mahasiswa')
    .select('*')
    .limit(1);
  if (errorKelas) {
    console.error('X kelas_mahasiswa error:', errorKelas.message);
  } else {
    console.log('✓ kelas_mahasiswa exists. Found rows:', kelas.length);
  }

  // Test asesmen_obe
  const { data: asesmen, error: errorAsesmen } = await supabase
    .from('asesmen_obe')
    .select('*')
    .limit(1);
  if (errorAsesmen) {
    console.error('X asesmen_obe error:', errorAsesmen.message);
  } else {
    console.log('✓ asesmen_obe exists. Found rows:', asesmen.length);
  }

  // Test nilai_asesmen_mahasiswa
  const { data: nilai, error: errorNilai } = await supabase
    .from('nilai_asesmen_mahasiswa')
    .select('*')
    .limit(1);
  if (errorNilai) {
    console.error('X nilai_asesmen_mahasiswa error:', errorNilai.message);
  } else {
    console.log('✓ nilai_asesmen_mahasiswa exists. Found rows:', nilai.length);
  }
}

check();
