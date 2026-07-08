import { supabase } from '../config.js';
import { dapatkanTanggalStr } from '../helpers.js';
import { setState } from '../state.js';

// ---- cek agenda (interactive) — user pilih hari/urgent ----
// ---- cek reminder — semua upcoming sekaligus ----
// ---- selesai / batal / tunda <id> — ubah status agenda ----
// ---- cancel / hapus jadwal ----

const STATUS_ICON = {
    pending: '⏰',
    selesai: '✅',
    batal: '❌',
    ditunda: '⏳',
};

export function formatJadwalItem(j) {
    const status = j.status || 'pending';
    const icon = STATUS_ICON[status] || '⏰';
    const label = status === 'pending' ? '' : ` — ${status.toUpperCase()}`;
    return `${icon} ${j.jam.slice(0, 5)} — ${j.kegiatan}${label}`;
}

export async function handleJadwalCommand(sock, remoteJid, text, textLow) {
    // ---- selesai <id> ----
    if (/^selesai\s+\d+$/.test(textLow)) {
        const id = text.match(/\d+/)[0];
        const { error } = await supabase.from('jadwal').update({ status: 'selesai' }).eq('id', id);
        if (!error) {
            await sock.sendMessage(remoteJid, { text: `✅ Agenda ID ${id} udah ditandai selesai!` });
        } else {
            await sock.sendMessage(remoteJid, { text: `Waduh error: ${error.message} 😅` });
        }
        return true;
    }

    // ---- batal <id> ----
    if (/^batal\s+\d+$/.test(textLow)) {
        const id = text.match(/\d+/)[0];
        const { error } = await supabase.from('jadwal').update({ status: 'batal' }).eq('id', id);
        if (!error) {
            await sock.sendMessage(remoteJid, { text: `❌ Agenda ID ${id} udah dibatalin!` });
        } else {
            await sock.sendMessage(remoteJid, { text: `Waduh error: ${error.message} 😅` });
        }
        return true;
    }

    // ---- tunda <id> [besok/lusa] [jam HH:MM] ----
    const tundaMatch = text.match(/^tunda\s+(\d+)(?:\s+(hari\s+ini|besok|lusa|kemarin))?(?:\s+jam\s+(\d{1,2})[.:](\d{2}))?$/i);
    if (tundaMatch) {
        const id = tundaMatch[1];
        let tglBaru = null;
        let jamBaru = null;

        if (tundaMatch[2]) {
            const offsetMap = { 'hari ini': 0, 'besok': 1, 'lusa': 2, 'kemarin': -1 };
            const key = tundaMatch[2].toLowerCase();
            tglBaru = dapatkanTanggalStr(offsetMap[key] ?? 0);
        }
        if (tundaMatch[3]) {
            jamBaru = `${tundaMatch[3].padStart(2, '0')}:${tundaMatch[4]}`;
        }

        const updateData = { status: 'ditunda' };
        if (tglBaru) updateData.tanggal = tglBaru;
        if (jamBaru) updateData.jam = jamBaru;

        const { error } = await supabase.from('jadwal').update(updateData).eq('id', id);
        if (!error) {
            let msg = `⏳ Agenda ID ${id} udah ditunda`;
            if (tglBaru) msg += ` ke ${tglBaru}`;
            if (jamBaru) msg += ` jam ${jamBaru}`;
            msg += '!';
            await sock.sendMessage(remoteJid, { text: msg });
        } else {
            await sock.sendMessage(remoteJid, { text: `Waduh error: ${error.message} 😅` });
        }
        return true;
    }

    // ---- cek agenda / cek jadwal — interactive ----
    if (textLow === 'cek agenda' || textLow === 'cek jadwal') {
        const msg = `📅 *Agenda* — Mau lihat yang mana, Tuan?\n\n1. Hari Ini\n2. Besok\n3. Kemarin\n4. Urgent (terlewat)\n\nKetik angka atau namanya ya 😊`;

        setState(remoteJid, { type: 'choose_agenda' });
        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // ---- cek reminder — semua upcoming (hari ini + 7 hari ke depan) ----
    if (textLow === 'cek reminder') {
        const tglHariIni = dapatkanTanggalStr(0);
        const tglAkhir = dapatkanTanggalStr(7);

        const { data: listJadwal } = await supabase
            .from('jadwal')
            .select('*')
            .gte('tanggal', tglHariIni)
            .lte('tanggal', tglAkhir)
            .order('tanggal', { ascending: true })
            .order('jam', { ascending: true });

        if (!listJadwal || listJadwal.length === 0) {
            await sock.sendMessage(remoteJid, {
                text: `Santai aja Tuan, belum ada agenda. Mau buat jadwal?\nKirim: jadwal, <kegiatan>, <tanggal>, <jam>\nContoh: jadwal, Meeting dengan klien, 2026-07-05, 14:00`
            });
            return true;
        }

        let msg = '🔔 *Reminder Tuan Kyy*\n\n';
        let currentDate = '';
        for (const j of listJadwal) {
            const tglLabel = new Date(j.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit'
            });
            if (j.tanggal !== currentDate) {
                currentDate = j.tanggal;
                const label = j.tanggal === tglHariIni ? 'Hari Ini' : tglLabel;
                msg += `📅 *${label}* (${j.tanggal}):\n`;
            }
            msg += formatJadwalItem(j) + '\n';
        }

        await sock.sendMessage(remoteJid, { text: msg.trim() });
        return true;
    }

    // ---- cancel / hapus jadwal ----
    if (textLow.startsWith('cancel jadwal') || textLow.startsWith('hapus jadwal')) {
        const idJadwal = textLow.replace(/\D/g, '');
        if (idJadwal) {
            await supabase.from('jadwal').delete().eq('id', idJadwal);
            await sock.sendMessage(remoteJid, { text: `Udah dihapus Tuan! Jadwal ID ${idJadwal} udah gak ada 🗑️` });
            return true;
        }
    }

    return false;
}

// ==================================================================
// Quick-add agenda via natural language: urgent/penting/reminder/todo
// ==================================================================
const TRIGGER_WORDS = ['urgent', 'penting', 'reminder', 'todo', 'to-do'];

const TIME_MAP = {
    pagi:  { jam: '07:00', display: '07:00 - 09:00' },
    siang: { jam: '12:00', display: '12:00 - 13:00' },
    sore:  { jam: '16:00', display: '16:00 - 18:00' },
    malam: { jam: '19:00', display: '19:00 - 21:00' },
};

export async function handleUrgentAgenda(sock, remoteJid, text, textLow) {
    const firstWord = textLow.split(/\s+/)[0];
    if (!TRIGGER_WORDS.includes(firstWord)) return false;

    // Format koma (urgent, ..., ...) → biar commabased.js yang handle
    if (text.includes(',')) return false;

    const raw = text.slice(firstWord.length).trim();
    if (!raw) return false;

    let task = raw;
    let dateOffset = 0;
    let jam = '12:00';
    let jamDisplay = '12:00';

    // Cek "untuk" sebagai separator natural: "... untuk ..."
    const untukMatch = raw.match(/^(.*?)\s+untuk\s+(.*)$/i);
    let meta = '';
    if (untukMatch) {
        task = untukMatch[1].trim();
        meta = untukMatch[2].toLowerCase();
    }

    const source = meta || raw.toLowerCase();

    // Extract time
    const jamMatch = source.match(/jam\s+(\d{1,2})[.:](\d{2})/);
    if (jamMatch) {
        jam = `${jamMatch[1].padStart(2, '0')}:${jamMatch[2]}`;
        jamDisplay = jam;
    } else {
        for (const [kata, data] of Object.entries(TIME_MAP)) {
            if (source.includes(kata)) {
                jam = data.jam;
                jamDisplay = data.display;
                break;
            }
        }
    }

    // Extract date
    if (source.includes('lusa')) {
        dateOffset = 2;
    } else if (source.includes('besok')) {
        dateOffset = 1;
    } else if (source.includes('kemarin')) {
        dateOffset = -1;
    }

    // Insert ke DB
    const tanggal = dapatkanTanggalStr(dateOffset);
    const { error } = await supabase.from('jadwal').insert([
        { kegiatan: task, tanggal, jam, status: 'pending' }
    ]);

    if (error) {
        await sock.sendMessage(remoteJid, {
            text: `Waduh error nih: ${error.message}. Coba lagi ya Tuan 😅`
        });
        return true;
    }

    // Label tanggal untuk display
    const dateLabel = dateOffset === 0 ? 'Hari Ini'
        : dateOffset === 1 ? 'Besok'
        : dateOffset === -1 ? 'Kemarin'
        : dateOffset === 2 ? 'Lusa'
        : tanggal;

    const timeInfo = jamDisplay === jam ? `jam ${jam}` : `jam ${jamDisplay}`;

    await sock.sendMessage(remoteJid, {
        text: `Siap Tuan! "${task}" udah dijadwalin ${dateLabel} ${timeInfo} ✅`
    });

    return true;
}
