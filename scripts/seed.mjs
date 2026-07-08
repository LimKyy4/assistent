#!/usr/bin/env node
/**
 * Seed script — populates database with initial/default data
 * Usage: node scripts/seed.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SEED_DATA = {
  dompet: [
    { id: 1, saldo: 0 }
  ],
  kategori_custom: [
    { nama_kategori: 'Gaji', tipe: 'pemasukan', saldo: 0 },
    { nama_kategori: 'Makanan', tipe: 'pengeluaran', saldo: 0 },
    { nama_kategori: 'Transportasi', tipe: 'pengeluaran', saldo: 0 },
    { nama_kategori: 'Belanja', tipe: 'pengeluaran', saldo: 0 },
    { nama_kategori: 'Hiburan', tipe: 'pengeluaran', saldo: 0 },
    { nama_kategori: 'Kesehatan', tipe: 'pengeluaran', saldo: 0 },
    { nama_kategori: 'Darurat', tipe: 'tabungan', saldo: 0 },
    { nama_kategori: 'Liburan', tipe: 'tabungan', saldo: 0 },
  ],
};

async function main() {
  console.log('Seeding database...\n');

  // Check if already seeded
  const { data: existing } = await supabase.from('kategori_custom').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('Database already has data. Use --force to re-seed.');
    if (!process.argv.includes('--force')) {
      process.exit(0);
    }
    // Clear existing
    const tables = ['transaksi', 'kategori_custom', 'jadwal'];
    for (const t of tables) {
      await supabase.from(t).delete().neq('id', 0);
    }
  }

  // Seed dompet
  const { data: dompet } = await supabase.from('dompet').select('id').eq('id', 1).single();
  if (!dompet) {
    const { error } = await supabase.from('dompet').insert(SEED_DATA.dompet);
    if (error) console.error(`  ✗ dompet: ${error.message}`);
    else console.log('  ✓ dompet: default');
  } else {
    console.log('  - dompet: already exists');
  }

  // Seed kategori_custom
  for (const kat of SEED_DATA.kategori_custom) {
    const { error } = await supabase.from('kategori_custom').insert(kat);
    if (error && error.code !== '23505') { // ignore duplicate
      console.error(`  ✗ kategori "${kat.nama_kategori}": ${error.message}`);
    } else {
      console.log(`  ✓ kategori "${kat.nama_kategori}" (${kat.tipe})`);
    }
  }

  console.log('\n✓ Seed complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
