import { supabase } from '../config.js';
import { formatRupiah } from '../helpers.js';

// ---- set wishlist <target> = <nominal> ----
// ---- cek wishlist ----
// ---- hapus wishlist ----

export async function handleWishlistCommand(sock, remoteJid, text, textLow) {
    // set wishlist <target> = <nominal>
    const setMatch = text.match(/^set wishlist (.+?)\s*=\s*(\d[\d.]*)$/i);
    if (setMatch) {
        const target = setMatch[1].trim();
        const nominal = parseInt(setMatch[2].replace(/\./g, ''));
        if (!target || !nominal || nominal <= 0) {
            await sock.sendMessage(remoteJid, { text: 'Format: set wishlist <target> = <nominal> ya Tuan 😊' });
            return true;
        }

        const { error } = await supabase.from('dompet').update({
            target_wishlist: target,
            nominal_wishlist: nominal
        }).eq('id', 1);

        if (error) {
            await sock.sendMessage(remoteJid, { text: `Waduh error: ${error.message} 😅` });
            return true;
        }

        await sock.sendMessage(remoteJid, {
            text: `Wishlist "${target}" (${formatRupiah(nominal)}) udah disimpan Tuan! 🎯💪`
        });
        return true;
    }

    // cek wishlist
    if (textLow === 'cek wishlist' || textLow === 'lihat wishlist') {
        const { data: dompet } = await supabase.from('dompet').select('*').eq('id', 1).single();
        if (!dompet || !dompet.target_wishlist) {
            await sock.sendMessage(remoteJid, { text: 'Belum ada wishlist Tuan. Mau bikin? Kirim: set wishlist <target> = <nominal> 😊' });
            return true;
        }

        const progress = dompet.nominal_wishlist > 0
            ? Math.min(100, Math.round(((dompet.saldo || 0) / dompet.nominal_wishlist) * 100))
            : 0;

        await sock.sendMessage(remoteJid, {
            text: `🎯 *Wishlist: ${dompet.target_wishlist}*\n\n`
                + `Target: ${formatRupiah(dompet.nominal_wishlist)}\n`
                + `Terkumpul: ${formatRupiah(dompet.saldo || 0)}\n`
                + `Progress: ${progress}%\n\n`
                + `Semangat Tuan! 💪🔥`
        });
        return true;
    }

    // hapus wishlist
    if (textLow === 'hapus wishlist') {
        const { error } = await supabase.from('dompet').update({
            target_wishlist: null,
            nominal_wishlist: null
        }).eq('id', 1);

        if (error) {
            await sock.sendMessage(remoteJid, { text: `Waduh error: ${error.message} 😅` });
            return true;
        }

        await sock.sendMessage(remoteJid, { text: 'Wishlist udah dihapus Tuan 🗑️😊' });
        return true;
    }

    return false;
}
