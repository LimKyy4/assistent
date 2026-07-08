/**
 * Lightweight i18n module for Kyy Assistant.
 *
 * Usage:
 *   import { t, setLanguage } from './i18n.js';
 *   t('greeting.morning');            // "Selamat pagi, Tuan Kyy!"
 *   t('error.generic', { msg: '...' });  // "Waduh error: ... 😅"
 *
 * To add a new language:
 *   1. Add a JSON file in src/locales/<lang>.json
 *   2. Register it in i18n.js
 *   3. Set LANG env var to the language code
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load locales ──
function loadLocale(lang) {
  try {
    const path = resolve(__dirname, 'locales', `${lang}.json`);
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

const DEFAULT_LANG = 'id';
let currentLang = DEFAULT_LANG;
let translations = loadLocale(currentLang);

/**
 * Set current language. Falls back to 'id' if not found.
 */
export function setLanguage(lang) {
  const locale = loadLocale(lang);
  if (Object.keys(locale).length > 0) {
    currentLang = lang;
    translations = locale;
  } else {
    currentLang = DEFAULT_LANG;
    translations = loadLocale(DEFAULT_LANG);
  }
}

/**
 * Get a translation by dot-notation key.
 * Supports interpolation: t('key', { var: 'value' })
 * Replaces {{var}} placeholders in the string.
 *
 * Falls back to the key itself if translation not found.
 */
export function t(key, vars = {}) {
  const value = key.split('.').reduce((obj, k) => obj?.[k], translations);
  if (typeof value !== 'string') return key;

  return value.replace(/{{(\w+)}}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

// ── Init from env ──
const envLang = process.env.LANG || process.env.LANGUAGE || '';
if (envLang) setLanguage(envLang);
