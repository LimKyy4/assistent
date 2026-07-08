import { supabase } from './config.js';
import { formatRupiah } from './helpers.js';

export async function cariKategori(nama) {
    const { data, error } = await supabase
        .from('kategori_custom')
        .select('*')
        .ilike('nama_kategori', nama.trim())
        .maybeSingle();
    if (error || !data) return null;
    return data;
}

export async function getDompet() {
    const { data, error } = await supabase
        .from('dompet')
        .select('*')
        .eq('id', 1)
        .single();
    if (error || !data) return null;
    return data;
}

export async function prosesTransaksiKategori(sock, remoteJid, kategori, nominal, keterangan) {
    if (kategori.tipe === 'pemasukan') {
        const dompet = await getDompet();
        await supabase
            .from('dompet')
            .update({ saldo: parseInt(dompet.saldo) + nominal })
            .eq('id', 1);
        await supabase
            .from('transaksi')
            .insert([{ kategori: kategori.nama_kategori, keterangan: keterangan || 'Pemasukan', nominal }]);

        await sock.sendMessage(remoteJid, {
            text: `Mantap Tuan! Udah tercatat ${formatRupiah(nominal)} buat ${kategori.nama_kategori}${keterangan ? ` — ${keterangan}` : ''} ✅`
        });
        return;
    }

    if (kategori.tipe === 'pengeluaran') {
        const dompet = await getDompet();
        await supabase
            .from('dompet')
            .update({ saldo: parseInt(dompet.saldo) - nominal })
            .eq('id', 1);
        await supabase
            .from('transaksi')
            .insert([{ kategori: kategori.nama_kategori, keterangan: keterangan || 'Pengeluaran', nominal }]);

        await sock.sendMessage(remoteJid, {
            text: `Oke Tuan! ${formatRupiah(nominal)} buat ${kategori.nama_kategori} udah dicatat${keterangan ? ` — ${keterangan}` : ''} 👍`
        });
        return;
    }

    if (kategori.tipe === 'tabungan') {
        await supabase
            .from('kategori_custom')
            .update({ saldo: parseInt(kategori.saldo || 0) + nominal })
            .eq('id', kategori.id);
        await supabase
            .from('transaksi')
            .insert([{ kategori: kategori.nama_kategori, keterangan: keterangan || 'Setoran tabungan', nominal }]);

        await sock.sendMessage(remoteJid, {
            text: `Nambah ${formatRupiah(nominal)} buat ${kategori.nama_kategori}! ${keterangan ? `(${keterangan}) ` : ''}Mantap Tuan 🏦`
        });
        return;
    }
}

export async function reverseTransaksi(trx) {
    const dompet = await getDompet();
    if (!dompet) return;

    const kategoriTrx = await cariKategori(trx.kategori);

    if (kategoriTrx && kategoriTrx.tipe === 'tabungan') {
        // Deteksi setoran vs penarikan via keterangan (lebih robust dari .includes)
        const keterangan = (trx.keterangan || '').toLowerCase();
        const isSetoran = keterangan.startsWith('setoran') || !keterangan;
        if (isSetoran) {
            await supabase.from('kategori_custom').update({ saldo: parseInt(kategoriTrx.saldo || 0) - parseInt(trx.nominal) }).eq('id', kategoriTrx.id);
        } else {
            await supabase.from('kategori_custom').update({ saldo: parseInt(kategoriTrx.saldo || 0) + parseInt(trx.nominal) }).eq('id', kategoriTrx.id);
        }
    } else if (kategoriTrx) {
        // Non-tabungan: reverse dompet berdasarkan tipe kategori (fix: pake tipe, bukan nama kategori)
        const multiplier = kategoriTrx.tipe === 'pemasukan' ? -1 : 1;
        await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) + (multiplier * parseInt(trx.nominal)) }).eq('id', 1);
    } else {
        // Kategori sudah dihapus — fallback ke heuristic nama kategori
        const multiplier = trx.kategori?.toLowerCase() === 'pemasukan' ? -1 : 1;
        await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) + (multiplier * parseInt(trx.nominal)) }).eq('id', 1);
    }

    await supabase.from('transaksi').delete().eq('id', trx.id);
}

