import { supabase } from '../config.js';
import { cariKategori, prosesTransaksiKategori, reverseTransaksi, getDompet } from '../db.js';
import { formatRupiah, formatRupiahSingkat, extractNominal, extractNominalWithIndex, bersihkanNamaKategori } from '../helpers.js';
import { setState } from '../state.js';

// ---- catat / tambah <kategori> <nominal> <keterangan> ----
// ---- kyy undo ----
// ---- hapus transaksi <id> ----

export async function handleTransaksiCommand(sock, remoteJid, text, textLow) {
    // kurang <kategori> <nominal> — universal reduce (pengeluaran & tabungan)
    if (textLow.startsWith('kurang ')) {
        const afterPrefix = text.slice('kurang '.length).trim();
        const result = extractNominalWithIndex(afterPrefix);
        if (result) {
            const { nominal, index: numIdx } = result;
            const tokens = afterPrefix.split(/\s+/);
            const namaKategori = bersihkanNamaKategori(tokens, numIdx);

            if (!namaKategori) {
                await sock.sendMessage(remoteJid, { text: 'Kategori nya apa Tuan? 😅' });
                return true;
            }

            const kategori = await cariKategori(namaKategori);
            if (!kategori) {
                await sock.sendMessage(remoteJid, { text: `Kategori "${namaKategori}" gak ketemu Tuan 🧐` });
                return true;
            }

            if (kategori.tipe === 'pemasukan') {
                await sock.sendMessage(remoteJid, { text: 'Gak bisa kurangin pemasukan ya Tuan 😅' });
                return true;
            }

            if (!nominal || nominal <= 0) {
                await sock.sendMessage(remoteJid, { text: 'Nominalnya berapa Tuan? 😅' });
                return true;
            }

            if (kategori.tipe === 'tabungan') {
                if (parseInt(kategori.saldo || 0) < nominal) {
                    await sock.sendMessage(remoteJid, { text: `Maaf Tuan, saldo "${kategori.nama_kategori}" cuma ${formatRupiah(kategori.saldo || 0)}, gak cukup 😅` });
                    return true;
                }
                await supabase.from('kategori_custom').update({ saldo: parseInt(kategori.saldo || 0) - nominal }).eq('id', kategori.id);
                await supabase.from('transaksi').insert([
                    { kategori: kategori.nama_kategori, keterangan: 'Penarikan tabungan', nominal }
                ]);
                await sock.sendMessage(remoteJid, {
                    text: `Udah dikurangin ${formatRupiah(nominal)} dari "${kategori.nama_kategori}". Sisa ${formatRupiah(parseInt(kategori.saldo || 0) - nominal)} 🏦👍`
                });
                return true;
            }

            // Pengeluaran
            const dompet = await getDompet();
            await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) - nominal }).eq('id', 1);
            await supabase.from('transaksi').insert([
                { kategori: kategori.nama_kategori, keterangan: 'Pengeluaran', nominal }
            ]);
            await sock.sendMessage(remoteJid, {
                text: `Oke Tuan! ${formatRupiah(nominal)} buat ${kategori.nama_kategori} udah dicatat 👍`
            });
            return true;
        }
    }

    // catat / tambah
    if (textLow.startsWith('catat ') || textLow.startsWith('tambah ')) {
        const afterPrefix = text.slice(5).trim();
        if (!afterPrefix) {
            await sock.sendMessage(remoteJid, { text: 'Formatnya: catat <kategori> <nominal> <keterangan> ya Tuan 😊' });
            return true;
        }

        const result = extractNominalWithIndex(afterPrefix);
        if (!result) {
            // Gak ada nominal — coba deteksi kategori buat state
            const words = afterPrefix.split(/\s+/);
            let foundKategori = null;
            let foundKeterangan = '';

            for (let i = words.length; i >= 1; i--) {
                const candidateName = bersihkanNamaKategori(words, i);
                const kat = await cariKategori(candidateName);
                if (kat) {
                    foundKategori = kat;
                    foundKeterangan = words.slice(i).join(' ');
                    break;
                }
            }

            if (!foundKategori) {
                const firstWord = bersihkanNamaKategori(words, 1);
                const katName = firstWord || words[0];
                setState(remoteJid, {
                    type: 'confirm_create_category',
                    namaKategori: katName
                });
                await sock.sendMessage(remoteJid, {
                    text: `Kategori "${katName}" gak ada Tuan. Mau bikin? 😊`
                });
                return true;
            }

            // Simpan state — tunggu nominal
            setState(remoteJid, {
                type: 'waiting_nominal',
                kategori: foundKategori.nama_kategori,
                keterangan: foundKeterangan
            });

            await sock.sendMessage(remoteJid, {
                text: `Berapa nominal ${foundKategori.nama_kategori}${foundKeterangan ? ` ${foundKeterangan}` : ''} nya Tuan? 😊`
            });
            return true;
        }

        const { nominal, index: numIdx } = result;
        const tokens = afterPrefix.split(/\s+/);
        const namaKategori = bersihkanNamaKategori(tokens, numIdx);
        const keterangan = tokens.slice(numIdx + 1).join(' ');

        if (!namaKategori) {
            await sock.sendMessage(remoteJid, { text: 'Kategori nya apa Tuan? 😅' });
            return true;
        }

        const kategori = await cariKategori(namaKategori);
        if (!kategori) {
            setState(remoteJid, {
                type: 'confirm_create_category',
                namaKategori: namaKategori
            });
            await sock.sendMessage(remoteJid, {
                text: `Kategori "${namaKategori}" gak ada Tuan. Mau bikin? 😊`
            });
            return true;
        }

        // Konfirmasi nominal besar
        if (nominal > 1000000 && !textLow.includes('konfirmasi')) {
            await sock.sendMessage(remoteJid, {
                text: `Wah ${formatRupiah(nominal)} nih Tuan, mau lanjut? Ketik lagi tambahin " konfirmasi" di akhir ya 😊`
            });
            return true;
        }

        await prosesTransaksiKategori(sock, remoteJid, kategori, nominal, keterangan);
        return true;
    }

    // kyy undo
    if (textLow === 'kyy undo') {
        const { data: lastTrx, error: fErr } = await supabase
            .from('transaksi')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (!fErr && lastTrx) {
            await reverseTransaksi(lastTrx);
            await sock.sendMessage(remoteJid, {
                text: `Udah Tuan, transaksi "${lastTrx.keterangan || lastTrx.kategori}" dibatalin 👍`
            });
            return true;
        }
    }

    // hapus transaksi <id>
    if (textLow.startsWith('hapus transaksi')) {
        const idTrx = textLow.replace(/\D/g, '');
        if (idTrx) {
            const { data: trx } = await supabase
                .from('transaksi')
                .select('*')
                .eq('id', idTrx)
                .single();

            if (trx) {
                await reverseTransaksi(trx);
                await sock.sendMessage(remoteJid, { text: `Udah Tuan, transaksi ID ${idTrx} dihapus 👍` });
                return true;
            }
        }
    }

    return false;
}
