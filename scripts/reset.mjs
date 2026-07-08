#!/usr/bin/env node
/**
 * Reset script — deletes ALL data from all tables
 * Usage: node scripts/reset.mjs
 *
 * WARNING: This will permanently delete all data!
 */

import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const TABLES = ['transaksi', 'kategori_custom', 'jadwal', 'dompet'];

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║     RESET ALL DATA — WARNING     ║');
  console.log('╚══════════════════════════════════╝\n');

  if (process.argv.includes('--force') || process.argv.includes('-f')) {
    await runReset();
  } else {
    console.log('This will DELETE all data from these tables:');
    TABLES.forEach(t => console.log(`  - ${t}`));
    console.log('\nTo confirm, run with --force flag:');
    console.log('  node scripts/reset.mjs --force');
    process.exit(0);
  }
}

async function runReset() {
  // Delete in reverse dependency order
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) {
      // Try alternative delete method
      const { error: e2 } = await supabase.from(table).delete().gte('id', 0);
      if (e2 && e2.code !== 'PGRST116') {
        console.error(`  ✗ ${table}: ${e2.message}`);
      } else {
        console.log(`  ✓ ${table}: cleared`);
      }
    } else {
      console.log(`  ✓ ${table}: cleared`);
    }
  }

  // Re-insert default dompet row
  const { error: insErr } = await supabase.from('dompet').insert([
    { id: 1, saldo: 0 }
  ]);
  if (insErr) {
    console.error(`  ✗ dompet: insert default failed - ${insErr.message}`);
  } else {
    console.log('  ✓ dompet: default row (saldo=0) created');
  }

  console.log('\n✓ Reset complete. All tables cleared.');
}

main().catch(err => { console.error(err); process.exit(1); });
