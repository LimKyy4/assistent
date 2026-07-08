import { supabase } from '../config.js';
import { cariKategori } from '../db.js';
import { dapatkanTanggalStr, formatRupiah, formatRupiahSingkat } from '../helpers.js';
import { setState } from '../state.js';

// ---- tempat <kategori> <periode>? ----
// ---- riwayat / history / histori ----
// ---- cek pengeluaran / laporan bulan ini ----

export async function handleRiwayatCommand(sock, remoteJid, text, textLow) {
    // tempat <kategori> <periode>?
    if (textLow.startsWith('tempat ')) {
        const sisa = text.slice('tempat '.length).replace(/\?$/, '').trim();
        const words = sisa.split(/\s+/);
        let periodeLabel = 'Hari Ini';
        let offset = 0;

        const lastWord = words[words.length - 1].toLowerCase();
        if (lastWord === 'kemarin') { offset = -1; periodeLabel = 'Kemarin'; words.pop(); }
        else if (lastWord === 'besok') { offset = 1; periodeLabel = 'Besok'; words.pop(); }
        else if (lastWord === 'lusa') { offset = 2; periodeLabel = 'Lusa'; words.pop(); }
        else if (lastWord === 'ini' && words.length >= 2 && words[words.length - 2].toLowerCase() === 'hari') {
            words.pop();
            words.pop();
        }

        const namaKategori = words.join(' ').trim();
        if (!namaKategori) {
            await sock.sendMessage(remoteJid, { text: 'Mau cari transaksi kategori apa Tuan? Format: tempat <kategori> <kemarin/besok>? 😊' });
            return true;
        }

        const kategori = await cariKategori(namaKategori);
        if (!kategori) {
            await sock.sendMessage(remoteJid, { text: `Kategori "${namaKategori}" gak ketemu Tuan 🧐` });
            return true;
        }

        const tglTarget = dapatkanTanggalStr(offset);
        const { data: trxList } = await supabase
            .from('transaksi')
            .select('*')
            .ilike('kategori', kategori.nama_kategori)
            .gte('created_at', `${tglTarget}T00:00:00Z`)
            .lte('created_at', `${tglTarget}T23:59:59Z`)
            .order('created_at', { ascending: false });

        if (!trxList || trxList.length === 0) {
            await sock.sendMessage(remoteJid, { text: `Gak ada transaksi "${kategori.nama_kategori}" ${periodeLabel.toLowerCase()} Tuan 📭` });
            return true;
        }

        let msg = `📋 **${kategori.nama_kategori} — ${periodeLabel}:**\n`;
        for (const [i, t] of trxList.entries()) {
            const jam = new Date(t.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
            msg += `\n${i + 1}. ${t.keterangan || '-'} (${formatRupiah(t.nominal)}) — ${jam}`;
        }

        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // riwayat / history / histori
    if (textLow.startsWith('riwayat') || textLow === 'history' || textLow === 'histori') {
        const sisa = text.slice(7).trim();
        let limit = 10;
        let filterKategori = null;
        let filterDateStart = null;
        let filterDateEnd = null;

        let sisaLower = sisa.toLowerCase();
        let header = '';

        if (!sisa) {
            header = `Nih ${limit} transaksi terakhir Tuan:`;
        } else if (sisaLower === 'minggu ini') {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
            filterDateStart = monday.toISOString().split('T')[0];
            filterDateEnd = dapatkanTanggalStr(0);
            limit = 50;
            header = `Minggu ini aja ya Tuan (${filterDateStart} — ${filterDateEnd}):`;
        } else if (sisaLower === 'bulan ini') {
            const now = new Date();
            filterDateStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            filterDateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            limit = 100;
            header = `Bulan ini aja ya Tuan (${filterDateStart} — ${filterDateEnd}):`;
        } else {
            const firstToken = sisa.split(/\s+/)[0];
            const numMatch = firstToken.replace(/\./g, '').match(/^\d+$/);

            if (numMatch) {
                limit = parseInt(numMatch[0]);
                header = `Nih ${limit} transaksi terakhir Tuan:`;
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(sisa.trim())) {
                filterDateStart = sisa.trim();
                filterDateEnd = sisa.trim();
                limit = 100;
                header = `Tanggal ${filterDateStart} aja ya Tuan:`;
            } else {
                filterKategori = sisa.trim();
                limit = 50;
                header = `Nih riwayat *${filterKategori}* nya Tuan:`;
            }
        }

        // Build & jalankan query
        let query = supabase.from('transaksi').select('*');

        if (filterKategori) {
            query = query.ilike('kategori', `%${filterKategori}%`);
        }

        if (filterDateStart) {
            query = query
                .gte('created_at', `${filterDateStart}T00:00:00Z`)
                .lte('created_at', `${filterDateEnd || filterDateStart}T23:59:59Z`);
        }

        const { data: trxList, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !trxList || trxList.length === 0) {
            if (filterKategori) {
                await sock.sendMessage(remoteJid, { text: `Santai aja Tuan, belum ada transaksi *${filterKategori}* ✨` });
            } else {
                await sock.sendMessage(remoteJid, { text: `Santai aja Tuan, belum ada transaksi di periode itu ✨` });
            }
            return true;
        }

        // Ambil data kategori untuk icon
        const uniqueKategori = [...new Set(trxList.map(t => t.kategori))];
        const kategoriMap = {};
        for (const nama of uniqueKategori) {
            const k = await cariKategori(nama);
            if (k) kategoriMap[nama] = k;
        }

        let msg = `${header}\n\n`;
        let total = 0;
        for (const t of trxList) {
            const kat = kategoriMap[t.kategori];
            let icon = '⬜';
            if (kat?.tipe === 'pemasukan') icon = '🔵';
            else if (kat?.tipe === 'pengeluaran') icon = '🟢';
            else if (kat?.tipe === 'tabungan') icon = '🟡';

            const nominalVal = parseInt(t.nominal);
            total += nominalVal;
            const jam = new Date(t.created_at).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }).replace(/,/g, '');
            msg += `${icon} ${t.kategori} — ${formatRupiahSingkat(nominalVal)}${t.keterangan ? ` (${t.keterangan})` : ''} — ${jam}\n`;
        }

        msg += `\n━━━━━━━━━━━━━━━\n💰 Total: ${formatRupiah(total)}`;

        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // Interactive: cek pengeluaran / laporan bulan ini
    if (textLow === 'cek pengeluaran' || textLow === 'laporan bulan ini') {
        const { data: kategoriList } = await supabase
            .from('kategori_custom')
            .select('*')
            .eq('tipe', 'pengeluaran')
            .order('nama_kategori', { ascending: true });

        if (!kategoriList || kategoriList.length === 0) {
            await sock.sendMessage(remoteJid, { text: 'Kategori pengeluaran masih kosong, Tuan Kyy 😊' });
            return true;
        }

        let msg = '💸 *Kategori Pengeluaran:*\n\n';
        for (const k of kategoriList) {
            msg += `• ${k.nama_kategori}\n`;
        }
        msg += `\nMau cek yang mana, Tuan? 😊`;

        setState(remoteJid, { type: 'choose_category', filterType: 'pengeluaran' });
        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // Interactive: cek kategori — show menu pilihan tipe
    if (textLow === 'cek kategori') {
        setState(remoteJid, { type: 'choose_kategori_type' });
        await sock.sendMessage(remoteJid, {
            text: `📂 *Kategori* — Mau lihat yang mana, Tuan Kyy?

1. Tabungan 🏦
2. Pemasukan 🔵
3. Pengeluaran 🟢
4. Semua Kategori 📂

Ketik angka atau namanya ya 😊`
        });
        return true;
    }

    // Interactive: cek pemasukan
    if (textLow === 'cek pemasukan') {
        const { data: kategoriList } = await supabase
            .from('kategori_custom')
            .select('*')
            .eq('tipe', 'pemasukan')
            .order('nama_kategori', { ascending: true });

        if (!kategoriList || kategoriList.length === 0) {
            await sock.sendMessage(remoteJid, { text: 'Kategori pemasukan masih kosong, Tuan Kyy 😊' });
            return true;
        }

        let msg = '🔵 *Kategori Pemasukan:*\n\n';
        for (const k of kategoriList) {
            msg += `• ${k.nama_kategori}\n`;
        }
        msg += `\nMau cek yang mana, Tuan? 😊`;

        setState(remoteJid, { type: 'choose_category', filterType: 'pemasukan' });
        await sock.sendMessage(remoteJid, { text: msg });
        return true;
    }

    // ---- cari <keyword> — search transaksi global ----
    if (textLow.startsWith('cari ')) {
        const keyword = text.slice('cari '.length).trim();
        if (!keyword) {
            await sock.sendMessage(remoteJid, { text: 'Cari apa Tuan? Contoh: cari makan 😊' });
            return true;
        }

        const { data: trxList, error } = await supabase
            .from('transaksi')
            .select('*')
            .or(`keterangan.ilike.%${keyword}%,kategori.ilike.%${keyword}%`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error || !trxList || trxList.length === 0) {
            await sock.sendMessage(remoteJid, { text: `Gak ada transaksi dengan kata "${keyword}" Tuan 📭` });
            return true;
        }

        let msg = `🔍 *Hasil pencarian: "${keyword}"* (${trxList.length} transaksi)\n\n`;
        for (const t of trxList) {
            const nominalVal = parseInt(t.nominal);
            const jam = new Date(t.created_at).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }).replace(/,/g, '');
            msg += `• ${t.kategori} — ${t.keterangan || '-'} (${formatRupiahSingkat(nominalVal)}) — ${jam}\n`;
        }

        await sock.sendMessage(remoteJid, { text: msg.trim() });
        return true;
    }

    return false;
}
