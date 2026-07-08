import { supabase } from '../config.js';
import { cariKategori } from '../db.js';
import { formatRupiah, formatRupiahSingkat, extractNominal, extractNominalWithIndex } from '../helpers.js';
import { setState } from '../state.js';

// ---- 2a. tabungan <nama> masuk <nominal> ----
// ---- 2b. tabungan <nama> keluar <nominal> ----
// ---- 2c. cek tabungan (list semua) ----
// ---- 2d. cek tabungan <nama> (detail) ----

export async function handleTabunganCommand(sock, remoteJid, text, textLow) {
    // 2a. tabungan <nama> masuk <nominal>
    const tabMasukMatch = text.match(/^tabungan (.+) masuk (.+)$/i);
    if (tabMasukMatch) {
        const namaTabungan = tabMasukMatch[1].trim();
        const nominal = extractNominal(tabMasukMatch[2]);
        if (!nominal || nominal <= 0) {
            await sock.sendMessage(remoteJid, { text: 'Nominalnya berapa Tuan? 😅' });
            return true;
        }

        const kategori = await cariKategori(namaTabungan);
        if (!kategori || kategori.tipe !== 'tabungan') {
            await sock.sendMessage(remoteJid, { text: `Tabungan "${namaTabungan}" gak ketemu Tuan. Cek "lihat kategori" dulu yuk 🧐` });
            return true;
        }

        await supabase.from('kategori_custom').update({ saldo: parseInt(kategori.saldo || 0) + nominal }).eq('id', kategori.id);
        await supabase.from('transaksi').insert([
            { kategori: kategori.nama_kategori, keterangan: 'Setoran tabungan', nominal }
        ]);

        await sock.sendMessage(remoteJid, {
            text: `Nambah ${formatRupiah(nominal)} ke "${kategori.nama_kategori}"! Total sekarang ${formatRupiah(parseInt(kategori.saldo || 0) + nominal)} 🏦💰`
        });
        return true;
    }

    // 2b. tabungan <nama> (keluar|tarik|potong|ambil|kurangin) <nominal>
    const tabKeluarMatch = text.match(/^tabungan (.+) (keluar|tarik|potong|ambil|kurangin) (.+)$/i);
    if (tabKeluarMatch) {
        const namaTabungan = tabKeluarMatch[1].trim();
        const nominal = extractNominal(tabKeluarMatch[3]);
        if (!nominal || nominal <= 0) {
            await sock.sendMessage(remoteJid, { text: 'Nominalnya berapa Tuan? 😅' });
            return true;
        }

        const kategori = await cariKategori(namaTabungan);
        if (!kategori || kategori.tipe !== 'tabungan') {
            await sock.sendMessage(remoteJid, { text: `Tabungan "${namaTabungan}" gak ketemu Tuan. Cek "lihat kategori" dulu yuk 🧐` });
            return true;
        }

        if (parseInt(kategori.saldo || 0) < nominal) {
            await sock.sendMessage(remoteJid, { text: `Maaf Tuan, saldo "${kategori.nama_kategori}" cuma ${formatRupiah(kategori.saldo || 0)}, gak cukup buat tarik ${formatRupiah(nominal)} 😅` });
            return true;
        }

        await supabase.from('kategori_custom').update({ saldo: parseInt(kategori.saldo || 0) - nominal }).eq('id', kategori.id);
        await supabase.from('transaksi').insert([
            { kategori: kategori.nama_kategori, keterangan: 'Penarikan tabungan', nominal }
        ]);

        await sock.sendMessage(remoteJid, {
            text: `Udah ditarik ${formatRupiah(nominal)} dari "${kategori.nama_kategori}". Sisa ${formatRupiah(parseInt(kategori.saldo || 0) - nominal)} 🏦👍`
        });
        return true;
    }

    // 2ab. tabungan <nama> <nominal> — auto-detect sebagai setoran (tanpa kata kunci)
    if (textLow.startsWith('tabungan ') && !/tabungan .*\b(masuk|keluar|tarik|potong|ambil|kurangin)\b/i.test(text)) {
        const afterPrefix = text.slice('tabungan '.length).trim();
        const result = extractNominalWithIndex(afterPrefix);
        if (result) {
            const { nominal, index: numIdx } = result;
            const tokens = afterPrefix.split(/\s+/);
            const namaTabungan = tokens.slice(0, numIdx).join(' ');
            const keterangan = tokens.slice(numIdx + 1).join(' ');

            if (!namaTabungan) {
                await sock.sendMessage(remoteJid, { text: 'Nama tabungannya apa Tuan? 😅' });
                return true;
            }

            const kategori = await cariKategori(namaTabungan);
            if (!kategori || kategori.tipe !== 'tabungan') {
                await sock.sendMessage(remoteJid, { text: `Tabungan "${namaTabungan}" gak ketemu Tuan. Cek "lihat kategori" dulu yuk 🧐` });
                return true;
            }

            if (!nominal || nominal <= 0) {
                await sock.sendMessage(remoteJid, { text: 'Nominalnya berapa Tuan? 😅' });
                return true;
            }

            await supabase.from('kategori_custom').update({ saldo: parseInt(kategori.saldo || 0) + nominal }).eq('id', kategori.id);
            await supabase.from('transaksi').insert([
                { kategori: kategori.nama_kategori, keterangan: keterangan || 'Setoran tabungan', nominal }
            ]);

            await sock.sendMessage(remoteJid, {
                text: `Nambah ${formatRupiah(nominal)} ke "${kategori.nama_kategori}"! Total sekarang ${formatRupiah(parseInt(kategori.saldo || 0) + nominal)} 🏦💰`
            });
            return true;
        }
    }

    // 2c. cek tabungan — interactive, list nama aja (kaya cek pengeluaran)
    if (textLow === 'cek tabungan') {
        const { data: tabunganList, error } = await supabase
            .from('kategori_custom')
            .select('*')
            .eq('tipe', 'tabungan')
            .order('nama_kategori', { ascending: true });

        if (error || !tabunganList || tabunganList.length === 0) {
            await sock.sendMessage(remoteJid, { text: 'Kategori tabungan masih kosong, Tuan Kyy 😊' });
            return true;
        }

        let msg = '🏦 *Kategori Tabungan:*\n\n';
        for (const t of tabunganList) {
            msg += `• ${t.nama_kategori}\n`;
        }
        msg += `\nMau cek yang mana, Tuan? 😊`;

        setState(remoteJid, { type: 'choose_category', filterType: 'tabungan' });
        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // 2d. cek tabungan <nama> (detail)
    if (textLow.startsWith('cek tabungan ')) {
        const namaTabungan = text.slice('cek tabungan '.length).trim();
        const kategori = await cariKategori(namaTabungan);
        if (!kategori || kategori.tipe !== 'tabungan') {
            await sock.sendMessage(remoteJid, { text: `Tabungan "${namaTabungan}" gak ketemu Tuan. Coba "cek tabungan" buat lihat semua 🧐` });
            return true;
        }

        const saldo = parseInt(kategori.saldo || 0);
        await sock.sendMessage(remoteJid, {
            text: `🏦 **${kategori.nama_kategori}**\n💰 Saldo: ${formatRupiah(saldo)}`
        });
        return true;
    }

    return false;
}
