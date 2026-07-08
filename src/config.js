import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { logError } from './logger.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const MY_JID_RAW = process.env.MY_JID || '6287882755480@s.whatsapp.net';
const MY_JIDS = MY_JID_RAW.split(',').map(j => j.trim()).filter(Boolean);
const MY_JID = MY_JIDS[0]; // Primary JID (backward compat)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logError('Config', 'Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const LANG = process.env.LANG || 'id';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase, MY_JID, MY_JIDS, LANG };

/**
 * Check if a JID is in the allowed list.
 * A personal bot — only respond to known contacts.
 */
export function isKnownJid(jid) {
  return MY_JIDS.some(j => jid ? jid.includes(j.split('@')[0]) : false);
}
