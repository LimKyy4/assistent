#!/usr/bin/env node
/**
 * Restore script — imports data from a backup directory into Supabase
 * Usage: node scripts/restore.mjs <backup-dir>
 *
 * WARNING: This will REPLACE all existing data in the affected tables!
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { readdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

dotenv.config({ path: resolve(rootDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function restoreTable(name, data) {
  // Delete all existing rows
  const { error: delErr } = await supabase.from(name).delete().neq('id', 0);
  if (delErr) {
    // Fallback for tables without 'id' or different PK
    const { error: delAllErr } = await supabase.from(name).delete().gte('id', 0);
    if (delAllErr && delAllErr.code !== 'PGRST116') {
      console.error(`  ✗ ${name}: delete failed - ${delAllErr.message}`);
      return false;
    }
  }

  // Insert restored data
  if (data.length > 0) {
    const { error: insErr } = await supabase.from(name).insert(data);
    if (insErr) {
      console.error(`  ✗ ${name}: insert failed - ${insErr.message}`);
      return false;
    }
  }

  console.log(`  ✓ ${name}: ${data.length} rows restored`);
  return true;
}

async function main() {
  const backupDirArg = process.argv[2];
  if (!backupDirArg) {
    console.error('Usage: node scripts/restore.mjs <backup-dir>');
    console.error('Example: node scripts/restore.mjs ./backups/backup-2026-07-08T15-00-00-000Z');
    process.exit(1);
  }

  const backupDir = resolve(rootDir, backupDirArg);
  if (!existsSync(backupDir)) {
    console.error(`Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  // Find all JSON files excluding _meta.json
  const files = (await readdir(backupDir))
    .filter(f => f.endsWith('.json') && f !== '_meta.json')
    .sort();

  if (files.length === 0) {
    console.error(`No JSON files found in ${backupDir}`);
    process.exit(1);
  }

  console.log(`Restoring from: ${backupDir}\n`);

  for (const file of files) {
    const tableName = basename(file, '.json');
    const raw = readFileSync(resolve(backupDir, file), 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      console.error(`  ✗ ${tableName}: invalid backup format (expected array)`);
      continue;
    }

    await restoreTable(tableName, data);
  }

  console.log(`\n✓ Restore complete from: ${backupDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });
