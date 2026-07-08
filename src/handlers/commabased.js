import { supabase } from '../config.js';
import { getDompet } from '../db.js';
import { formatRupiah, dapatkanTanggalStr } from '../helpers.js';

// Legacy comma-based format:
//   jadwal, <kegiatan>, <tanggal>, <jam>
//   pemasukan, <keterangan>, <nominal>
//   pengeluaran, <keterangan>, <nominal>
//   urgent, <keterangan>, <nominal>

export async function handleCommaCommand(sock, remoteJid, text, textLow) {
    if (!text.includes(',')) return false;

    const parts = text.split(',').map(item => item.trim());

    // ---- jadwal ----
    if (parts[0].toLowerCase() === 'jadwal' && parts.length === 4) {
        const [_, valKegiatan, valTanggalRaw, valJamRaw] = parts;
        // Konversi kata relatif ke tanggal nyata
        const tglLower = valTanggalRaw.toLowerCase().trim();
        let valTanggal = valTanggalRaw;
        if (tglLower === 'hari ini') valTanggal = dapatkanTanggalStr(0);
        else if (tglLower === 'besok') valTanggal = dapatkanTanggalStr(1);
        else if (tglLower === 'lusa') valTanggal = dapatkanTanggalStr(2);
        else if (tglLower === 'kemarin') valTanggal = dapatkanTanggalStr(-1);
        // Auto-correct jam: 20.00 → 20:00
        const valJam = valJamRaw.replace(/\./g, ':');

        const { error } = await supabase.from('jadwal').insert([{ kegiatan: valKegiatan, tanggal: valTanggal, jam: valJam }]);
        if (error) {
            await sock.sendMessage(remoteJid, {
                text: `Waduh error: ${error.message}. Coba format jam HH:MM ya Tuan 😅`
            });
            return true;
        }

        await sock.sendMessage(remoteJid, {
            text: `Oke Tuan! "${valKegiatan}" ${valTanggal} jam ${valJam} udah dijadwalin 📅✅`
        });
        return true;
    }

    // ---- transaksi pemasukan/pengeluaran ----
    if (parts.length >= 3) {
        const [kategoriRaw, deskripsiKeterangan, nominalStr] = parts;
        let kategori = kategoriRaw.toLowerCase();

        if (kategori === 'urgent') kategori = 'pengeluaran';

        if (kategori === 'pemasukan' || kategori === 'pengeluaran') {
            const nominal = parseInt(nominalStr.replace(/\D/g, ''));
            if (!isNaN(nominal)) {
                if (nominal > 1000000 && !textLow.includes('konfirmasi ya')) {
                    await sock.sendMessage(remoteJid, {
                        text: `${formatRupiah(nominal)} nih Tuan, yakin? Ketik lagi tambahin ", konfirmasi ya" di akhir 😊`
                    });
                    return true;
                }

                const { data: insertedData, error: insertErr } = await supabase
                    .from('transaksi')
                    .insert([{ kategori, keterangan: deskripsiKeterangan, nominal }])
                    .select();

                if (insertErr || !insertedData || insertedData.length === 0) {
                    throw new Error(insertErr?.message || 'Gagal simpan transaksi.');
                }

                const multiplier = kategori === 'pemasukan' ? nominal : -nominal;
                const dompet = await getDompet();
                await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) + multiplier }).eq('id', 1);

                await sock.sendMessage(remoteJid, {
                    text: `Udah Tuan! ${formatRupiah(nominal)} ${kategori === 'pemasukan' ? 'masuk' : 'buat'} ${deskripsiKeterangan || kategori} tercatat ✅`
                });
                return true;
            }
        }
    }

    return false;
}
