import { supabase } from '../config.js';
import { cariKategori } from '../db.js';
import { formatRupiahSingkat } from '../helpers.js';
import { setState } from '../state.js';

// ---- 1a. buat kategori baru = <nama> (interactive, tanya tipe) ----
// ---- 1b. buat kategori <tipe> = <nama> (explicit tipe) ----
// ---- 1c. ganti nama kategori <lama> menjadi <baru> ----
// ---- 1d. hapus kategori <nama> ----
// ---- 1e. lihat kategori / daftar kategori ----

export async function handleKategoriCommand(sock, remoteJid, text, textLow) {
    // 1a. buat kategori baru = <nama> — interactive: tanya tipe
    if (textLow.startsWith('buat kategori baru = ')) {
        const namaKategori = text.slice('buat kategori baru = '.length).trim();
        if (!namaKategori) {
            await sock.sendMessage(remoteJid, { text: 'Nama kategori nya diisi dulu Tuan 😅' });
            return true;
        }

        const existing = await cariKategori(namaKategori);
        if (existing) {
            await sock.sendMessage(remoteJid, { text: `Kategori "${namaKategori}" udah ada Tuan, pake nama lain aja 😁` });
            return true;
        }

        // Auto-detect tabungan kalau diawali "nabung"
        if (namaKategori.toLowerCase().startsWith('nabung')) {
            const { error } = await supabase.from('kategori_custom').insert([
                { nama_kategori: namaKategori, tipe: 'tabungan' }
            ]);
            if (error) {
                await sock.sendMessage(remoteJid, { text: `Waduh error nih: ${error.message}. Coba lagi ya Tuan 😅` });
                return true;
            }
            await sock.sendMessage(remoteJid, {
                text: `Done Tuan! Kategori "${namaKategori}" (TABUNGAN) udah siap dipake 💪`
            });
            return true;
        }

        // Minta tipe dari user
        setState(remoteJid, { type: 'waiting_kategori_type', namaKategori });
        await sock.sendMessage(remoteJid, {
            text: `Kategori "${namaKategori}" pemasukan atau pengeluaran, Tuan Zidane? 😊`
        });
        return true;
    }

    // 1b. buat kategori <tipe> = <nama>
    const buatKategoriMatch = text.match(/^buat kategori (pemasukan|pengeluaran|tabungan) = (.+)$/i);
    if (buatKategoriMatch) {
        const tipe = buatKategoriMatch[1].toLowerCase();
        const namaKategori = buatKategoriMatch[2].trim();
        if (!namaKategori) {
            await sock.sendMessage(remoteJid, { text: 'Nama kategori nya diisi dulu Tuan 😅' });
            return true;
        }

        const existing = await cariKategori(namaKategori);
        if (existing) {
            await sock.sendMessage(remoteJid, { text: `Kategori "${namaKategori}" udah ada Tuan, pake nama lain aja 😁` });
            return true;
        }

        const { error } = await supabase.from('kategori_custom').insert([
            { nama_kategori: namaKategori, tipe }
        ]);
        if (error) {
            await sock.sendMessage(remoteJid, { text: `Waduh error nih: ${error.message}. Coba lagi ya Tuan 😅` });
            return true;
        }

        await sock.sendMessage(remoteJid, {
            text: `Done Tuan! Kategori "${namaKategori}" (${tipe.toUpperCase()}) udah siap dipake 💪`
        });
        return true;
    }

    // 1c. ganti nama kategori <lama> menjadi <baru>
    const renameMatch = text.match(/^ganti nama kategori (.+) menjadi (.+)$/i);
    if (renameMatch) {
        const namaLama = renameMatch[1].trim();
        const namaBaru = renameMatch[2].trim();
        if (!namaLama || !namaBaru) {
            await sock.sendMessage(remoteJid, { text: 'Formatnya: ganti nama kategori <lama> menjadi <baru> ya Tuan 😊' });
            return true;
        }

        const kategori = await cariKategori(namaLama);
        if (!kategori) {
            await sock.sendMessage(remoteJid, { text: `Kategori "${namaLama}" gak ketemu Tuan. Cek "lihat kategori" dulu yuk 🧐` });
            return true;
        }

        const { error } = await supabase.from('kategori_custom')
            .update({ nama_kategori: namaBaru })
            .eq('id', kategori.id);
        if (error) {
            await sock.sendMessage(remoteJid, { text: `Gagal rename nih: ${error.message} 😅` });
            return true;
        }

        await sock.sendMessage(remoteJid, {
            text: `Sip! "${namaLama}" jadi "${namaBaru}" sekarang ✨`
        });
        return true;
    }

    // 1d. hapus kategori <nama>
    if (textLow.startsWith('hapus kategori ')) {
        const namaKategori = text.slice('hapus kategori '.length).trim();
        const kategori = await cariKategori(namaKategori);
        if (!kategori) {
            await sock.sendMessage(remoteJid, { text: `Kategori "${namaKategori}" gak ketemu Tuan 🧐` });
            return true;
        }

        if (kategori.tipe !== 'tabungan') {
            const { data: trxTerkait } = await supabase.from('transaksi')
                .select('id').ilike('kategori', namaKategori).limit(1);
            if (trxTerkait && trxTerkait.length > 0) {
                await sock.sendMessage(remoteJid, {
                    text: `Maaf Tuan, "${namaKategori}" masih punya transaksi. Mungkin di-rename aja daripada dihapus? 😊`
                });
                return true;
            }
        }

        const { error } = await supabase.from('kategori_custom').delete().eq('id', kategori.id);
        if (error) {
            await sock.sendMessage(remoteJid, { text: `Gagal hapus nih: ${error.message} 😅` });
            return true;
        }

        await sock.sendMessage(remoteJid, {
            text: `Udah Tuan, "${namaKategori}" berhasil dihapus 🗑️`
        });
        return true;
    }

    // 1e. lihat kategori / daftar kategori
    if (textLow === 'lihat kategori' || textLow === 'daftar kategori') {
        const { data: kategoriList, error } = await supabase
            .from('kategori_custom')
            .select('*')
            .order('tipe', { ascending: true })
            .order('nama_kategori', { ascending: true });

        if (error || !kategoriList || kategoriList.length === 0) {
            await sock.sendMessage(remoteJid, { text: 'Belum ada kategori Tuan. Coba "buat kategori baru = <nama>" yuk 📂' });
            return true;
        }

        let msg = '📂 **Kategori yang tersedia:**\n\n';
        const grouped = {};
        for (const k of kategoriList) {
            if (!grouped[k.tipe]) grouped[k.tipe] = [];
            grouped[k.tipe].push(k);
        }
        for (const [tipe, list] of Object.entries(grouped)) {
            msg += `*${tipe.toUpperCase()}*\n`;
            for (const k of list) {
                const saldoTxt = k.tipe === 'tabungan' ? ` (💰 ${formatRupiahSingkat(k.saldo)})` : '';
                msg += `  • ${k.nama_kategori}${saldoTxt}\n`;
            }
            msg += '\n';
        }

        await sock.sendMessage(remoteJid, { text: msg.trim() });
        return true;
    }

    return false;
}
