#!/usr/bin/env node
/**
 * Migration helper — prints pending SQL migrations for manual execution
 * in Supabase SQL Editor.
 *
 * Supabase anon key does NOT have DDL permissions, so SQL must be
 * run manually via the Supabase Dashboard (SQL Editor).
 *
 * Usage:
 *   node scripts/migrate.mjs           # Show all pending migrations
 *   node scripts/migrate.mjs --apply   # Mark all as applied (no-op tracking)
 *   node scripts/migrate.mjs --sql     # Print concatenated SQL
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '..', 'migrations');
const stateFile = resolve(__dirname, '..', 'migrations', '.state.json');

async function getAppliedMigrations() {
  if (!existsSync(stateFile)) return [];
  return JSON.parse(readFileSync(stateFile, 'utf-8'));
}

async function getMigrationFiles() {
  if (!existsSync(migrationsDir)) return [];
  const files = await readdir(migrationsDir);
  return files.filter(f => f.endsWith('.sql')).sort();
}

async function main() {
  const allFiles = await getMigrationFiles();
  if (allFiles.length === 0) {
    console.log('No migration files found in ./migrations/');
    return;
  }

  const applied = await getAppliedMigrations();
  const pending = allFiles.filter(f => !applied.includes(f));

  if (pending.length === 0) {
    console.log('✓ All migrations are applied.');
    return;
  }

  if (process.argv.includes('--sql')) {
    // Print concatenated SQL for copy-paste
    for (const file of pending) {
      const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
      console.log(`-- === ${file} ===`);
      console.log(sql);
      console.log();
    }
    return;
  }

  if (process.argv.includes('--apply')) {
    // Mark all pending as applied
    const newState = [...applied, ...pending];
    writeFileSync(stateFile, JSON.stringify(newState, null, 2));
    console.log(`✓ Marked ${pending.length} migration(s) as applied:`);
    pending.forEach(f => console.log(`  - ${f}`));
    console.log('\n⚠  Remember to run the SQL manually in Supabase SQL Editor.');
    return;
  }

  // Default: show status
  console.log(`Migration files: ${allFiles.length}`);
  console.log(`Applied: ${applied.length}`);
  console.log(`Pending: ${pending.length}\n`);

  if (pending.length > 0) {
    console.log('Pending migrations:');
    pending.forEach(f => console.log(`  - ${f}`));
    console.log('\nTo run:');
    console.log('  1. Copy SQL:  node scripts/migrate.mjs --sql');
    console.log('  2. Paste & run in Supabase SQL Editor');
    console.log('  3. Mark applied:  node scripts/migrate.mjs --apply');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
