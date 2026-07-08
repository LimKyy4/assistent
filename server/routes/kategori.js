import { supabase } from '../db.js';

const VALID_TIPES = ['pemasukan', 'pengeluaran', 'tabungan'];

export async function getKategori(req, res) {
    try {
        const { data, error } = await supabase
            .from('kategori_custom')
            .select('*')
            .order('tipe', { ascending: true })
            .order('nama_kategori', { ascending: true });
        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function createKategori(req, res) {
    try {
        const { nama_kategori, tipe } = req.body;

        if (!nama_kategori || typeof nama_kategori !== 'string' || !nama_kategori.trim()) {
            return res.status(400).json({ error: 'nama_kategori wajib diisi' });
        }
        if (!tipe || !VALID_TIPES.includes(tipe)) {
            return res.status(400).json({ error: 'tipe harus pemasukan/pengeluaran/tabungan' });
        }

        const trimmed = nama_kategori.trim();

        // Cek duplikat
        const { data: existing } = await supabase.from('kategori_custom')
            .select('*').ilike('nama_kategori', trimmed).maybeSingle();
        if (existing) return res.status(409).json({ error: `Kategori "${trimmed}" sudah ada` });

        const { data, error } = await supabase.from('kategori_custom')
            .insert([{ nama_kategori: trimmed, tipe }])
            .select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateKategori(req, res) {
    try {
        const { id } = req.params;
        const { nama_kategori, tipe, saldo } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID kategori tidak valid' });
        }
        if (tipe && !VALID_TIPES.includes(tipe)) {
            return res.status(400).json({ error: 'tipe harus pemasukan/pengeluaran/tabungan' });
        }

        const updateData = {};
        if (nama_kategori) updateData.nama_kategori = nama_kategori.trim();
        if (tipe) updateData.tipe = tipe;
        if (saldo !== undefined) updateData.saldo = parseInt(saldo);

        const { data, error } = await supabase.from('kategori_custom')
            .update(updateData).eq('id', id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteKategori(req, res) {
    try {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID kategori tidak valid' });
        }

        const { data: kategori } = await supabase.from('kategori_custom').select('*').eq('id', id).single();
        if (!kategori) return res.status(404).json({ error: 'Kategori tidak ditemukan' });

        // Cek transaksi terkait
        const { data: trxTerkait } = await supabase.from('transaksi')
            .select('id').ilike('kategori', kategori.nama_kategori).limit(1);
        if (trxTerkait && trxTerkait.length > 0) {
            return res.status(409).json({ error: `Kategori "${kategori.nama_kategori}" masih memiliki transaksi. Hapus transaksi terlebih dahulu atau rename kategori.` });
        }

        const { error } = await supabase.from('kategori_custom').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Kategori berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
