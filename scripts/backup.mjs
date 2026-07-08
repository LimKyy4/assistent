#!/usr/bin/env node
/**
 * Backup script — exports all data from Supabase tables to JSON files
 * Usage: node scripts/backup.mjs [--dir ./backups]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load env from root
dotenv.config({ path: resolve(rootDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = ['dompet', 'transaksi', 'kategori_custom', 'jadwal'];

async function backupTable(name) {
  const { data, error } = await supabase.from(name).select('*');
  if (error) {
    console.error(`  ✗ ${name}: ${error.message}`);
    return null;
  }
  console.log(`  ✓ ${name}: ${data.length} rows`);
  return data;
}

async function main() {
  const backupDir = process.argv[2] || resolve(rootDir, 'backups');
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = resolve(backupDir, `backup-${timestamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`Backing up to: ${outDir}\n`);

  const results = {};
  for (const table of TABLES) {
    results[table] = await backupTable(table);
  }

  // Write each table to a separate JSON file
  for (const [table, data] of Object.entries(results)) {
    if (data) {
      writeFileSync(resolve(outDir, `${table}.json`), JSON.stringify(data, null, 2));
    }
  }

  // Write metadata
  const meta = {
    timestamp: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map(t => [t, results[t]?.length || 0])),
  };
  writeFileSync(resolve(outDir, '_meta.json'), JSON.stringify(meta, null, 2));

  console.log(`\n✓ Backup complete: ${outDir}`);
  console.log(`  Tables: ${TABLES.filter(t => results[t]).length}/${TABLES.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
