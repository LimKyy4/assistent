// ---- Help & Greeting ----
// Greeting: halo/hai/pagi + kyy → sapa + set state waiting_user_intent
// Help: help/bantuan/menu/command → tampilkan list (langsung, tanpa state)

import { setState } from '../state.js';
import { t } from '../i18n.js';

const GREETING_PATTERNS = [
    /^halo\s+kyy/i, /^hai\s+kyy/i, /^hey\s+kyy/i, /^pagi\s+kyy/i,
    /^siang\s+kyy/i, /^sore\s+kyy/i, /^malam\s+kyy/i,
];

const HELP_WORDS = ['help', 'bantuan', 'menu', 'command', 'perintah', 'commands', 'tolong'];

function getGreeting() {
    const jam = new Date().getHours();
    if (jam < 12) return 'pagi';
    if (jam < 15) return 'siang';
    if (jam < 18) return 'sore';
    return 'malam';
}

function buildHelpMessage() {
    return `Apa yang perlu kamu ketahui, Tuan Zidane?

💸 *Transaksi Keuangan*
Mau catat pemasukan atau pengeluaran?
• catat <kategori> <nominal> — Contoh: catat gaji 5000000
• catat <kategori> — Saya akan tanya nominalnya
• tabungan <nama> masuk <nominal> — Nabung
• tabungan <nama> keluar / tarik / potong / ambil / kurangin — Tarik tabungan
• kurang <kategori> <nominal> — Kurangi saldo (pengeluaran / tabungan)

📅 *Jadwal & Agenda*
Atur jadwal harian dengan mudah:
• cek agenda — Hari ini/besok/kemarin/urgent
• cek reminder — Semua agenda 7 hari ke depan
• selesai <id> / batal <id> / tunda <id>
• jadwal, <kegiatan>, <tanggal>, <jam>

🔍 *Cek & Lacak*
Pantau kondisi keuangan:
• cek pengeluaran / pemasukan / tabungan / kategori
• riwayat [jumlah/minggu/bulan/tanggal/kategori]
• kyy undo — Batalkan transaksi terakhir

📂 *Atur Kategori*
• buat kategori baru = <nama>
• ganti nama kategori <lama> menjadi <baru>
• hapus kategori <nama>

Ada yang mau dicoba, Tuan? 😊`;
}

export function isGreeting(text, textLow) {
    return GREETING_PATTERNS.some(p => p.test(text));
}

export async function handleGreeting(sock, remoteJid, text, textLow) {
    if (!isGreeting(text, textLow)) return false;

    const waktu = getGreeting();
    await sock.sendMessage(remoteJid, {
        text: `Selamat ${waktu} Tuan Zidane, ada yang bisa saya bantu?`
    });

    // Set state biar user bisa lanjut interaktif
    setState(remoteJid, { type: 'waiting_user_intent' });
    return true;
}

export async function handleHelpCommand(sock, remoteJid, text, textLow) {
    if (!HELP_WORDS.includes(textLow.trim())) return false;

    const msg = buildHelpMessage();
    await sock.sendMessage(remoteJid, { text: msg });
    return true;
}
