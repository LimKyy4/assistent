import { supabase } from './config.js';
import { dapatkanTanggalStr } from './helpers.js';
import { logError, logInfo } from './logger.js';

// Helper: kirim ke satu atau banyak JID
async function kirimKeJid(sock, targetJids, text) {
    const jids = Array.isArray(targetJids) ? targetJids : [targetJids];
    for (const jid of jids) {
        try {
            await sock.sendMessage(jid, { text });
        } catch (err) {
            logError('Cron', `Gagal kirim ke ${jid}`, err);
        }
    }
}

export async function kirimPengingatJadwalHarian(sock, targetJids) {
    try {
        const tglHariIni = dapatkanTanggalStr(0);
        const { data: listJadwal } = await supabase
            .from('jadwal')
            .select('*')
            .eq('tanggal', tglHariIni)
            .order('jam', { ascending: true });

        let resJadwal = `⏰ *Morning Reminder: Jadwal Aktivitas Hari Ini* (${tglHariIni})\n\n`;
        if (!listJadwal || listJadwal.length === 0) {
            resJadwal += `_Tidak ada agenda untuk hari ini, Tuan Kyy. Waktunya santai atau fokus project!_ ✨`;
        } else {
            for (const j of listJadwal) {
                resJadwal += `📌 *[ID: ${j.id}]* ⏰ ${j.jam.slice(0, 5)} -> ${j.kegiatan}\n`;
            }
        }

        await kirimKeJid(sock, targetJids,
            `👑 *Kyy Assistant* 👑\n\nSelamat pagi, Tuan Kyy! ✨\nBerikut agenda Anda hari ini:\n\n${resJadwal}`
        );
        logInfo('Cron', 'Pengingat jadwal harian berhasil dikirim otomatis');
    } catch (err) {
        logError('Cron', 'Gagal kirim reminder otomatis', err);
    }
}

// ── Notifikasi agenda yang akan datang (dalam 1 jam ke depan) ──
export async function kirimPengingatJadwalMendekat(sock, targetJids) {
    try {
        const now = new Date();
        const tglHariIni = dapatkanTanggalStr(0);
        const jamSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Batas waktu 1 jam ke depan
        const batas = new Date(now.getTime() + 60 * 60 * 1000);
        const jamBatas = `${String(batas.getHours()).padStart(2, '0')}:${String(batas.getMinutes()).padStart(2, '0')}`;

        const { data: listJadwal } = await supabase
            .from('jadwal')
            .select('*')
            .eq('tanggal', tglHariIni)
            .eq('status', 'pending')
            .gte('jam', jamSekarang)
            .lte('jam', jamBatas)
            .order('jam', { ascending: true });

        if (!listJadwal || listJadwal.length === 0) return;

        let msg = `🔔 *Reminder: Agenda Segera!*\n\n`;
        for (const j of listJadwal) {
            msg += `📌 *[ID: ${j.id}]* ⏰ ${j.jam.slice(0, 5)} — ${j.kegiatan}\n`;
        }
        msg += `\nJangan sampai kelewatan ya Tuan! ⏰`;

        await kirimKeJid(sock, targetJids, msg);
        logInfo('Cron', `Pengingat agenda mendekat: ${listJadwal.length} agenda dikirim`);
    } catch (err) {
        logError('Cron', 'Gagal kirim pengingat agenda mendekat', err);
    }
}
