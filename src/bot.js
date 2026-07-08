import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import cron from 'node-cron';

import { MY_JID, MY_JIDS, LANG } from './config.js';
import { kirimPengingatJadwalHarian, kirimPengingatJadwalMendekat } from './cron.js';
import { handleMessage } from './handlers/index.js';
import { setLanguage } from './i18n.js';

export async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('--- Scan QR Code di atas dengan WhatsApp kamu ---');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            // Set default language for cron/scheduled messages
            setLanguage(LANG);
            console.log('Bot WhatsApp Assistant Berhasil Terhubung ke Supabase Cloud, Kyy!');

            // ── Cron: pagi 07:00 — reminder jadwal hari ini ──
            cron.schedule('0 7 * * *', () => {
                kirimPengingatJadwalHarian(sock, MY_JIDS);
            }, {
                scheduled: true,
                timezone: 'Asia/Jakarta'
            });

            // ── Cron: tiap 30 menit — notifikasi agenda dalam 1 jam ke depan ──
            cron.schedule('*/30 * * * *', () => {
                kirimPengingatJadwalMendekat(sock, MY_JIDS);
            }, {
                scheduled: true,
                timezone: 'Asia/Jakarta'
            });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        // Hanya proses pesan baru dari server, bukan append/prepend (history lokal)
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message) return;
        await handleMessage(sock, msg);
    });
}
