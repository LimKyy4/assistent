import { supabase, isKnownJid, MY_JIDS, LANG } from '../config.js';
import { cariKategori } from '../db.js';
import { formatRupiahSingkat, formatRupiah, extractNominal, dapatkanTanggalStr } from '../helpers.js';
import { takeState, setState } from '../state.js';
import { logError } from '../logger.js';
import { setLanguage } from '../i18n.js';

import { handleKategoriCommand } from './kategori.js';
import { handleTabunganCommand } from './tabungan.js';
import { handleRiwayatCommand } from './riwayat.js';
import { handleJadwalCommand } from './jadwal.js';
import { handleTransaksiCommand } from './transaksi.js';
import { handleCommaCommand } from './commabased.js';
import { handleHelpCommand, handleGreeting, isGreeting } from './help.js';
import { formatJadwalItem, handleUrgentAgenda } from './jadwal.js';
import { handleWishlistCommand } from './wishlist.js';

const AFFIRMATIVE = ['iya', 'ya', 'y', 'yoi', 'yups', 'yep', 'yes', 'ok', 'oke', 'sip', 'siap', 'bikin', 'buatkan', 'buat', 'lanjut', 'ayo', 'aye', 'tambah', 'tolong', 'bisa', 'boleh', 'mau'];

// Debounce: cegah bot memproses balasannya sendiri (self-chat loop)
const debounceTimestamps = new Map(); // remoteJid → { text, timestamp }

export async function handleMessage(sock, msg) {
    const remoteJid = msg.key.remoteJid;
    const incomingText = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
    const textLow = incomingText.toLowerCase();

    // Loop breaker: skip kalau pesan yang sama persis datang dalam 800ms
    const last = debounceTimestamps.get(remoteJid);
    if (last && last.text === incomingText && Date.now() - last.timestamp < 800) {
        return;
    }
    debounceTimestamps.set(remoteJid, { text: incomingText, timestamp: Date.now() });

    // JID whitelist: skip pesan dari nomor tak dikenal
    if (!isKnownJid(remoteJid)) return;

    // Set language based on env (per-user lang can be extended later)
    setLanguage(LANG);

    try {
        // ==================================================================
        // 0. CONVERSATION STATE CHECK (preamble)
        //     Pakai takeState() — ambil & hapus atomik, cegah interleaving duplikat event.
        //     Kalau perlu state tetap (input invalid), setState() lagi.
        // ==================================================================
        const pendingState = takeState(remoteJid);
        if (pendingState) {
            const firstWord = incomingText.trim().toLowerCase().split(/\s+/)[0];

            if (pendingState.type === 'waiting_nominal') {
                const nominal = extractNominal(incomingText);
                if (nominal && nominal > 0) {
                    const kategori = await cariKategori(pendingState.kategori);
                    if (kategori) {
                        if (kategori.tipe === 'pemasukan') {
                            const { data: dompet } = await supabase.from('dompet').select('*').eq('id', 1).single();
                            await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) + nominal }).eq('id', 1);
                        } else if (kategori.tipe === 'pengeluaran') {
                            const { data: dompet } = await supabase.from('dompet').select('*').eq('id', 1).single();
                            await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) - nominal }).eq('id', 1);
                        } else if (kategori.tipe === 'tabungan') {
                            await supabase.from('kategori_custom').update({ saldo: parseInt(kategori.saldo || 0) + nominal }).eq('id', kategori.id);
                        }
                        await supabase.from('transaksi').insert([{ kategori: kategori.nama_kategori, keterangan: pendingState.keterangan || '', nominal }]);

                        const nominalTxt = formatRupiahSingkat(nominal);
                        const detailTxt = pendingState.keterangan ? ` ${pendingState.keterangan}` : '';
                        await sock.sendMessage(remoteJid, {
                            text: `Oke Tuan, udah tercatat. *${kategori.nama_kategori}*${detailTxt} sebesar ${nominalTxt}. Ada lagi? 😊`
                        });
                    }
                    // State udah dihapus atomik oleh takeState()
                    return;
                }
                // Bukan angka — restore state, biar bisa coba lagi
                setState(remoteJid, {
                    type: 'waiting_nominal',
                    kategori: pendingState.kategori,
                    keterangan: pendingState.keterangan
                });
                return;
            }

            if (pendingState.type === 'confirm_create_category') {
                const katName = pendingState.namaKategori;

                if (AFFIRMATIVE.includes(firstWord)) {
                    let tipe = 'pengeluaran';
                    if (katName.toLowerCase().startsWith('nabung')) tipe = 'tabungan';

                    const existing = await cariKategori(katName);
                    if (!existing) {
                        await supabase.from('kategori_custom').insert([{ nama_kategori: katName, tipe }]);
                        await sock.sendMessage(remoteJid, {
                            text: `Done Tuan! Kategori "${katName}" udah siap dipake 💪`
                        });
                    } else {
                        await sock.sendMessage(remoteJid, {
                            text: `Kategori "${katName}" udah ada kok Tuan 😁`
                        });
                    }
                    // State udah dihapus atomik
                    return;
                }

                // Tolak — batal, jangan restore state
                const NEGATIVE_WORDS = ['tidak', 'gak', 'nggak', 'enggak', 'ga', 'no', 'ndak', 'ngga'];
                if (NEGATIVE_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan, gak jadi bikin kategorinya 😊' });
                    return;
                }

                // Bukan affirmative & bukan negative — restore state, biar bisa jawab lagi
                setState(remoteJid, {
                    type: 'confirm_create_category',
                    namaKategori: katName
                });
                // Fall through ke routing normal (state tetap)
            }

            // ==================================================================
            // STATE: waiting_kategori_type — user milih tipe untuk kategori baru
            // ==================================================================
            waitingKategoriTypeBlock: if (pendingState.type === 'waiting_kategori_type') {
                const CANCEL_WORDS = ['cancel', 'batal', 'gak jadi', 'nggak jadi', 'tidak jadi', 'ga jadi', 'kembali', 'back'];
                const COMMAND_PREFIXES = ['cek', 'catat', 'tambah', 'buat', 'ganti', 'hapus', 'kyy', 'riwayat', 'history', 'histori', 'tempat', 'tabungan', 'jadwal', 'selesai', 'batal', 'tunda', 'kurang'];

                // Cek cancel
                if (CANCEL_WORDS.includes(textLow.trim()) || CANCEL_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan, santai aja 😊' });
                    return;
                }

                // Cek greeting — redirect ke greeting (akan set state baru)
                if (isGreeting(incomingText, textLow)) {
                    await handleGreeting(sock, remoteJid, incomingText, textLow);
                    return;
                }

                // Cek apakah ini command lain — state udah dihapus atomik, lanjut routing
                if (COMMAND_PREFIXES.some(prefix => textLow.startsWith(prefix))) {
                    break waitingKategoriTypeBlock;
                }

                const pilihan = textLow.trim().toLowerCase();
                const VALID_TIPE = ['pemasukan', 'pengeluaran'];

                if (VALID_TIPE.includes(pilihan)) {
                    const { error } = await supabase.from('kategori_custom').insert([
                        { nama_kategori: pendingState.namaKategori, tipe: pilihan }
                    ]);
                    if (error) {
                        setState(remoteJid, { type: 'waiting_kategori_type', namaKategori: pendingState.namaKategori });
                        await sock.sendMessage(remoteJid, {
                            text: `Waduh error nih: ${error.message}. Coba lagi ya Tuan 😅`
                        });
                        return;
                    }
                    await sock.sendMessage(remoteJid, {
                        text: `Done Tuan! Kategori "${pendingState.namaKategori}" (${pilihan.toUpperCase()}) udah siap dipake 💪`
                    });
                    return;
                }

                // Gak dikenal — restore state + tanya ulang
                setState(remoteJid, { type: 'waiting_kategori_type', namaKategori: pendingState.namaKategori });
                await sock.sendMessage(remoteJid, {
                    text: `Ketik "pemasukan" atau "pengeluaran" aja ya Tuan 😊\nKategori "${pendingState.namaKategori}" mau diisi apa?`
                });
                return;
            }

            chooseCategoryBlock: if (pendingState.type === 'choose_category') {
                const CANCEL_WORDS = ['cancel', 'batal', 'gak jadi', 'nggak jadi', 'tidak jadi', 'ga jadi', 'kembali', 'back'];
                const COMMAND_PREFIXES = ['cek', 'catat', 'tambah', 'buat', 'ganti', 'hapus', 'kyy', 'riwayat', 'history', 'histori', 'tempat', 'tabungan', 'jadwal', 'selesai', 'batal', 'tunda', 'kurang'];

                // Cek cancel
                if (CANCEL_WORDS.includes(textLow.trim()) || CANCEL_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan, santai aja 😊' });
                    return;
                }

                // Cek greeting — redirect ke greeting (akan set state baru)
                if (isGreeting(incomingText, textLow)) {
                    await handleGreeting(sock, remoteJid, incomingText, textLow);
                    return;
                }

                // Cek apakah ini command lain — state udah dihapus atomik, lanjut routing
                if (COMMAND_PREFIXES.some(prefix => textLow.startsWith(prefix))) {
                    break chooseCategoryBlock;
                }

                // Cari kategori berdasarkan input user
                const filterType = pendingState.filterType;
                const kategori = await cariKategori(incomingText.trim());

                if (kategori && (filterType === 'all' || kategori.tipe === filterType)) {
                    // Query 10 transaksi terakhir untuk kategori ini
                    const { data: trxList } = await supabase
                        .from('transaksi')
                        .select('*')
                        .ilike('kategori', kategori.nama_kategori)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (!trxList || trxList.length === 0) {
                        await sock.sendMessage(remoteJid, {
                            text: `Belum ada transaksi *${kategori.nama_kategori}* Tuan 📭`
                        });
                        return;
                    }

                    const icon = filterType === 'pemasukan' ? '🔵' : filterType === 'pengeluaran' ? '🟢' : '🟡';
                    const label = filterType.charAt(0).toUpperCase() + filterType.slice(1);
                    const judul = `${icon} *${kategori.nama_kategori}* — ${label} (${trxList.length} transaksi terakhir)\n`;

                    let msg = judul + '\n';
                    let total = 0;
                    for (const [i, t] of trxList.entries()) {
                        const nominalVal = parseInt(t.nominal);
                        total += nominalVal;
                        const jam = new Date(t.created_at).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        }).replace(/,/g, '');
                        msg += `${i + 1}. ${t.keterangan || '-'} — ${formatRupiahSingkat(nominalVal)} — ${jam}\n`;
                    }

                    msg += `\n━━━━━━━━━━━━━━━\n💰 Total: ${formatRupiah(total)}`;

                    await sock.sendMessage(remoteJid, { text: msg });
                    return;
                }

                // Kategori gak ketemu — restore state + relist
                setState(remoteJid, { type: 'choose_category', filterType });

                let queryKategori = supabase.from('kategori_custom').select('*');
                if (filterType !== 'all') {
                    queryKategori = queryKategori.eq('tipe', filterType);
                }
                const { data: kategoriList } = await queryKategori.order('nama_kategori', { ascending: true });

                const labelType = filterType === 'all' ? 'Kategori' : filterType.charAt(0).toUpperCase() + filterType.slice(1);
                let ulangMsg = `Sepertinya yang Anda maksud tidak ada.\n\n📂 *${labelType} yang tersedia:*\n`;
                for (const k of kategoriList || []) {
                    ulangMsg += `• ${k.nama_kategori}\n`;
                }
                ulangMsg += `\nMau cek yang mana, Tuan? 😊`;

                await sock.sendMessage(remoteJid, { text: ulangMsg });
                return;
            }

            // ==================================================================
            // STATE: choose_kategori_type — user milih tipe dari menu "cek kategori"
            // ==================================================================
            chooseKategoriTypeBlock: if (pendingState.type === 'choose_kategori_type') {
                const CANCEL_WORDS = ['cancel', 'batal', 'gak jadi', 'nggak jadi', 'tidak jadi', 'ga jadi', 'kembali', 'back'];
                const COMMAND_PREFIXES = ['cek', 'catat', 'tambah', 'buat', 'ganti', 'hapus', 'kyy', 'riwayat', 'history', 'histori', 'tempat', 'tabungan', 'jadwal', 'selesai', 'batal', 'tunda', 'kurang'];

                // Cek cancel
                if (CANCEL_WORDS.includes(textLow.trim()) || CANCEL_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan, santai aja 😊' });
                    return;
                }

                // Cek greeting — redirect
                if (isGreeting(incomingText, textLow)) {
                    await handleGreeting(sock, remoteJid, incomingText, textLow);
                    return;
                }

                // Cek command lain — state udah dihapus atomik, lanjut routing
                if (COMMAND_PREFIXES.some(prefix => textLow.startsWith(prefix))) {
                    break chooseKategoriTypeBlock;
                }

                const pilihan = textLow.trim().toLowerCase();
                let filterType = null;
                let labelType = '';

                if (pilihan === '1' || pilihan === 'tabungan') {
                    filterType = 'tabungan';
                    labelType = 'Tabungan';
                } else if (pilihan === '2' || pilihan === 'pemasukan') {
                    filterType = 'pemasukan';
                    labelType = 'Pemasukan';
                } else if (pilihan === '3' || pilihan === 'pengeluaran') {
                    filterType = 'pengeluaran';
                    labelType = 'Pengeluaran';
                } else if (pilihan === '4' || pilihan === 'semua' || pilihan.startsWith('lain')) {
                    filterType = 'all';
                    labelType = 'Semua Kategori';
                } else {
                    // Gak dikenal — restore state + relist menu
                    setState(remoteJid, { type: 'choose_kategori_type' });
                    await sock.sendMessage(remoteJid, {
                        text: `Pilih 1-4 aja ya Tuan 😊\n\n📂 *Kategori* — Mau lihat yang mana, Tuan Kyy?\n1. Tabungan 🏦\n2. Pemasukan 🔵\n3. Pengeluaran 🟢\n4. Semua Kategori 📂`
                    });
                    return;
                }

                // Query kategori sesuai tipe
                let queryKategori = supabase.from('kategori_custom').select('*');
                if (filterType !== 'all') {
                    queryKategori = queryKategori.eq('tipe', filterType);
                }
                const { data: kategoriList } = await queryKategori.order('nama_kategori', { ascending: true });

                if (!kategoriList || kategoriList.length === 0) {
                    const pesanKosong = filterType === 'all'
                        ? 'Belum ada kategori apapun, Tuan Kyy 😊'
                        : `Kategori ${labelType.toLowerCase()} masih kosong, Tuan Kyy 😊`;
                    await sock.sendMessage(remoteJid, { text: pesanKosong });
                    return;
                }

                // Tampilkan list + set state choose_category untuk lanjut pilih
                let msg = '';
                if (filterType === 'all') {
                    const grouped = {};
                    for (const k of kategoriList) {
                        if (!grouped[k.tipe]) grouped[k.tipe] = [];
                        grouped[k.tipe].push(k);
                    }
                    msg = `📂 *Semua Kategori:*\n\n`;
                    for (const [tipe, list] of Object.entries(grouped)) {
                        msg += `*${tipe.toUpperCase()}*\n`;
                        for (const k of list) {
                            const saldoTxt = k.tipe === 'tabungan' ? ` (💰 ${formatRupiahSingkat(k.saldo)})` : '';
                            msg += `  • ${k.nama_kategori}${saldoTxt}\n`;
                        }
                        msg += '\n';
                    }
                } else {
                    const icon = filterType === 'pemasukan' ? '🔵' : filterType === 'pengeluaran' ? '🟢' : '🏦';
                    msg = `${icon} *Kategori ${labelType}:*\n\n`;
                    for (const k of kategoriList) {
                        const saldoTxt = k.tipe === 'tabungan' ? ` (💰 ${formatRupiahSingkat(k.saldo)})` : '';
                        msg += `• ${k.nama_kategori}${saldoTxt}\n`;
                    }
                }
                msg += `\nMau cek yang mana, Tuan? 😊`;

                setState(remoteJid, { type: 'choose_category', filterType });
                await sock.sendMessage(remoteJid, { text: msg });
                return;
            }

            // ==================================================================
            // STATE: choose_agenda — user milih opsi agenda (hari ini/besok/dll)
            // ==================================================================
            chooseAgendaBlock: if (pendingState.type === 'choose_agenda') {
                const CANCEL_WORDS = ['cancel', 'batal', 'gak jadi', 'nggak jadi', 'tidak jadi', 'ga jadi', 'kembali', 'back'];
                const COMMAND_PREFIXES = ['cek', 'catat', 'tambah', 'buat', 'ganti', 'hapus', 'kyy', 'riwayat', 'history', 'histori', 'tempat', 'tabungan', 'jadwal', 'selesai', 'batal', 'tunda', 'kurang'];

                // Cek cancel
                if (CANCEL_WORDS.includes(textLow.trim()) || CANCEL_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan, santai aja 😊' });
                    return;
                }

                // Cek greeting — redirect ke greeting (akan set state baru)
                if (isGreeting(incomingText, textLow)) {
                    await handleGreeting(sock, remoteJid, incomingText, textLow);
                    return;
                }

                // Cek apakah ini command lain — state udah dihapus atomik, lanjut routing
                if (COMMAND_PREFIXES.some(prefix => textLow.startsWith(prefix))) {
                    break chooseAgendaBlock;
                }

                // Tentukan opsi pilihan user
                const pilihan = textLow.trim();
                let targetTgl = null;
                let labelHari = '';
                let isUrgent = false;

                if (pilihan === '1' || pilihan === 'hari ini' || pilihan === 'hari') {
                    targetTgl = dapatkanTanggalStr(0);
                    labelHari = 'Hari Ini';
                } else if (pilihan === '2' || pilihan === 'besok') {
                    targetTgl = dapatkanTanggalStr(1);
                    labelHari = 'Besok';
                } else if (pilihan === '3' || pilihan === 'kemarin') {
                    targetTgl = dapatkanTanggalStr(-1);
                    labelHari = 'Kemarin';
                } else if (pilihan === '4' || pilihan === 'urgent' || pilihan === 'terlewat') {
                    isUrgent = true;
                    labelHari = 'Terlewat';
                } else {
                    // Gak dikenal — restore state + relist menu
                    setState(remoteJid, { type: 'choose_agenda' });
                    await sock.sendMessage(remoteJid, {
                        text: `Pilih 1-4 aja ya Tuan 😊\n\n📅 *Agenda* — Mau lihat yang mana, Tuan?\n1. Hari Ini\n2. Besok\n3. Kemarin\n4. Urgent (terlewat)`
                    });
                    return;
                }

                // Query sesuai opsi
                let query = supabase.from('jadwal').select('*');
                if (isUrgent) {
                    query = query.lt('tanggal', dapatkanTanggalStr(0));
                } else {
                    query = query.eq('tanggal', targetTgl);
                }
                const { data: listJadwal } = await query.order('jam', { ascending: true });

                if (!listJadwal || listJadwal.length === 0) {
                    const pesanKosong = isUrgent
                        ? 'Semua beres Tuan, gak ada agenda yang terlewat 👍'
                        : `Santai aja Tuan, gak ada agenda ${labelHari.toLowerCase()} ✨`;
                    await sock.sendMessage(remoteJid, { text: pesanKosong });
                    return;
                }

                const icon = isUrgent ? '⚠️' : '📅';
                const header = isUrgent
                    ? `${icon} *Agenda Terlewat:*\n\n`
                    : `${icon} *Agenda ${labelHari}:*\n\n`;

                let msg = header;
                for (const j of listJadwal) {
                    const tglInfo = isUrgent ? `${j.tanggal} ` : '';
                    msg += `${tglInfo}${formatJadwalItem(j)}\n`;
                }

                await sock.sendMessage(remoteJid, { text: msg.trim() });
                return;
            }

            // ==================================================================
            // STATE: waiting_user_intent — user baru disapa, waiting for intent
            // ==================================================================
            if (pendingState.type === 'waiting_user_intent') {
                const CANCEL_WORDS = ['cancel', 'batal', 'gak jadi', 'nggak jadi', 'tidak jadi', 'ga jadi', 'kembali', 'back'];
                const HELP_WORDS = ['help', 'bantuan', 'menu', 'command', 'perintah', 'commands', 'tolong'];

                // Cancel
                if (CANCEL_WORDS.includes(textLow.trim()) || CANCEL_WORDS.includes(firstWord)) {
                    await sock.sendMessage(remoteJid, { text: 'Ok Tuan Zidane, santai aja 😊' });
                    return;
                }

                // Minta bantuan — tampilkan help
                if (HELP_WORDS.includes(textLow.trim())) {
                    await handleHelpCommand(sock, remoteJid, incomingText, textLow);
                    return;
                }

                // Lainnya — anggap command valid, state udah dihapus, lanjut routing
            }
        }

        // ==================================================================
        // ROUTE TO HANDLERS
        // ==================================================================

        const handlers = [
            handleHelpCommand,
            handleGreeting,
            handleKategoriCommand,
            handleTabunganCommand,
            handleRiwayatCommand,
            handleJadwalCommand,
            handleTransaksiCommand,
            handleUrgentAgenda,
            handleWishlistCommand,
            handleCommaCommand,
        ];

        for (const handler of handlers) {
            if (await handler(sock, remoteJid, incomingText, textLow)) {
                return; // handled
            }
        }

    } catch (error) {
        logError('Core', 'Error core system', error);
        await sock.sendMessage(remoteJid, { text: `Maaf Tuan, ada error nih. Coba lagi ya 😅` });
    }
}
