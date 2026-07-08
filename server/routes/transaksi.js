import { supabase } from '../db.js';

// ── Helpers ──
function isPositiveInt(v) {
    const n = parseInt(v);
    return !isNaN(n) && n > 0;
}

export async function getTransaksi(req, res) {
    try {
        const { page = 1, limit = 20, kategori, tipe, start_date, end_date, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase.from('transaksi').select('*', { count: 'exact' });

        if (kategori) query = query.ilike('kategori', `%${kategori}%`);
        if (tipe) {
            const { data: katList } = await supabase.from('kategori_custom').select('nama_kategori').eq('tipe', tipe);
            if (katList?.length) {
                query = query.in('kategori', katList.map(k => k.nama_kategori));
            }
        }
        if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`);
        if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`);
        if (search) query = query.ilike('keterangan', `%${search}%`);

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) return res.status(500).json({ error: error.message });
        res.json({
            data: data || [],
            total: count || 0,
            page: parseInt(page),
            total_pages: Math.ceil((count || 0) / parseInt(limit)),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function exportTransaksiCsv(req, res) {
    try {
        const { start_date, end_date, kategori, tipe } = req.query;

        let query = supabase.from('transaksi').select('*');

        if (kategori) query = query.ilike('kategori', `%${kategori}%`);
        if (tipe) {
            const { data: katList } = await supabase.from('kategori_custom').select('nama_kategori').eq('tipe', tipe);
            if (katList?.length) {
                query = query.in('kategori', katList.map(k => k.nama_kategori));
            }
        }
        if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`);
        if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        // Build CSV
        const header = 'ID,Kategori,Keterangan,Nominal,Tanggal\n';
        const rows = (data || []).map(t =>
            [t.id, t.kategori, `"${(t.keterangan || '').replace(/"/g, '""')}"`, t.nominal, t.created_at].join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=transaksi_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + header + rows); // BOM for Excel UTF-8
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function createTransaksi(req, res) {
    try {
        const { kategori, keterangan, nominal } = req.body;

        // Validation
        if (!kategori || typeof kategori !== 'string') {
            return res.status(400).json({ error: 'kategori wajib diisi' });
        }
        if (!isPositiveInt(nominal)) {
            return res.status(400).json({ error: 'nominal harus angka positif' });
        }

        const nominalNum = parseInt(nominal);

        const { data: kat } = await supabase.from('kategori_custom')
            .select('*').ilike('nama_kategori', kategori.trim()).maybeSingle();
        if (!kat) return res.status(404).json({ error: `Kategori "${kategori}" tidak ditemukan` });

        if (kat.tipe === 'pemasukan') {
            const { data: dompet } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) + nominalNum }).eq('id', 1);
        } else if (kat.tipe === 'pengeluaran') {
            const { data: dompet } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(dompet.saldo) - nominalNum }).eq('id', 1);
        } else if (kat.tipe === 'tabungan') {
            await supabase.from('kategori_custom').update({ saldo: parseInt(kat.saldo || 0) + nominalNum }).eq('id', kat.id);
        }

        const { data, error } = await supabase.from('transaksi').insert([
            { kategori: kat.nama_kategori, keterangan: keterangan || '', nominal: nominalNum }
        ]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateTransaksi(req, res) {
    try {
        const { id } = req.params;
        const { kategori, keterangan, nominal } = req.body;

        if (!id || !isPositiveInt(id)) {
            return res.status(400).json({ error: 'ID transaksi tidak valid' });
        }
        if (nominal !== undefined && !isPositiveInt(nominal)) {
            return res.status(400).json({ error: 'nominal harus angka positif' });
        }

        const { data: oldTrx } = await supabase.from('transaksi').select('*').eq('id', id).single();
        if (!oldTrx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

        // Reverse old transaction
        const { data: oldKat } = await supabase.from('kategori_custom')
            .select('*').ilike('nama_kategori', oldTrx.kategori.trim()).maybeSingle();

        if (oldKat?.tipe === 'pemasukan') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) - parseInt(oldTrx.nominal) }).eq('id', 1);
        } else if (oldKat?.tipe === 'pengeluaran') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) + parseInt(oldTrx.nominal) }).eq('id', 1);
        } else if (oldKat?.tipe === 'tabungan') {
            const oldKet = (oldTrx.keterangan || '').toLowerCase();
            const oldIsSetoran = oldKet.startsWith('setoran') || !oldKet;
            const oldMultiplier = oldIsSetoran ? -1 : 1; // reverse: setoran → kurangi, penarikan → tambah
            await supabase.from('kategori_custom').update({ saldo: parseInt(oldKat.saldo || 0) + (oldMultiplier * parseInt(oldTrx.nominal)) }).eq('id', oldKat.id);
        }

        // Apply new transaction
        const nominalNum = nominal !== undefined ? parseInt(nominal) : parseInt(oldTrx.nominal);
        const { data: newKat } = await supabase.from('kategori_custom')
            .select('*').ilike('nama_kategori', (kategori || oldTrx.kategori).trim()).maybeSingle();

        if (newKat?.tipe === 'pemasukan') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) + nominalNum }).eq('id', 1);
        } else if (newKat?.tipe === 'pengeluaran') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) - nominalNum }).eq('id', 1);
        } else if (newKat?.tipe === 'tabungan') {
            await supabase.from('kategori_custom').update({ saldo: parseInt(newKat.saldo || 0) + nominalNum }).eq('id', newKat.id);
        }

        const updateData = {};
        if (kategori) updateData.kategori = kategori;
        if (keterangan !== undefined) updateData.keterangan = keterangan;
        if (nominal !== undefined) updateData.nominal = nominalNum;

        const { data, error } = await supabase.from('transaksi').update(updateData).eq('id', id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteTransaksi(req, res) {
    try {
        const { id } = req.params;
        if (!id || !isPositiveInt(id)) {
            return res.status(400).json({ error: 'ID transaksi tidak valid' });
        }

        const { data: trx } = await supabase.from('transaksi').select('*').eq('id', id).single();
        if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

        const { data: kat } = await supabase.from('kategori_custom')
            .select('*').ilike('nama_kategori', trx.kategori.trim()).maybeSingle();

        if (kat?.tipe === 'pemasukan') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) - parseInt(trx.nominal) }).eq('id', 1);
        } else if (kat?.tipe === 'pengeluaran') {
            const { data: d } = await supabase.from('dompet').select('*').eq('id', 1).single();
            await supabase.from('dompet').update({ saldo: parseInt(d.saldo) + parseInt(trx.nominal) }).eq('id', 1);
        } else if (kat?.tipe === 'tabungan') {
            const ket = (trx.keterangan || '').toLowerCase();
            const isSetoran = ket.startsWith('setoran') || !ket;
            if (isSetoran) {
                await supabase.from('kategori_custom').update({ saldo: parseInt(kat.saldo || 0) - parseInt(trx.nominal) }).eq('id', kat.id);
            } else {
                await supabase.from('kategori_custom').update({ saldo: parseInt(kat.saldo || 0) + parseInt(trx.nominal) }).eq('id', kat.id);
            }
        }

        const { error } = await supabase.from('transaksi').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Transaksi berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
