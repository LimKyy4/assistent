import { supabase } from '../db.js';

const VALID_STATUSES = ['pending', 'selesai', 'batal', 'ditunda'];

export async function getJadwal(req, res) {
    try {
        const { status, tanggal, start_date, end_date } = req.query;
        let query = supabase.from('jadwal').select('*');

        if (status) query = query.eq('status', status);
        if (tanggal) query = query.eq('tanggal', tanggal);
        if (start_date) query = query.gte('tanggal', start_date);
        if (end_date) query = query.lte('tanggal', end_date);

        const { data, error } = await query
            .order('tanggal', { ascending: true })
            .order('jam', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        // Ensure status never null (fallback for records created before migration)
        const denganStatus = (data || []).map(j => ({ ...j, status: j.status || 'pending' }));
        res.json(denganStatus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function createJadwal(req, res) {
    try {
        const { kegiatan, tanggal, jam } = req.body;

        if (!kegiatan || typeof kegiatan !== 'string' || !kegiatan.trim()) {
            return res.status(400).json({ error: 'kegiatan wajib diisi' });
        }
        if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
            return res.status(400).json({ error: 'tanggal harus format YYYY-MM-DD' });
        }
        if (!jam || !/^\d{2}:\d{2}/.test(jam)) {
            return res.status(400).json({ error: 'jam harus format HH:MM' });
        }

        const cleanJam = jam.replace(/\./g, ':');
        const { data, error } = await supabase.from('jadwal')
            .insert([{ kegiatan: kegiatan.trim(), tanggal, jam: cleanJam, status: 'pending' }])
            .select().single();

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateJadwal(req, res) {
    try {
        const { id } = req.params;
        const { kegiatan, tanggal, jam, status } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID jadwal tidak valid' });
        }
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'status harus pending/selesai/batal/ditunda' });
        }
        if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
            return res.status(400).json({ error: 'tanggal harus format YYYY-MM-DD' });
        }

        const updateData = {};
        if (kegiatan) updateData.kegiatan = kegiatan.trim();
        if (tanggal) updateData.tanggal = tanggal;
        if (jam) updateData.jam = jam.replace(/\./g, ':');
        if (status) updateData.status = status;

        const { data, error } = await supabase.from('jadwal')
            .update(updateData).eq('id', id).select().single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteJadwal(req, res) {
    try {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID jadwal tidak valid' });
        }

        const { error } = await supabase.from('jadwal').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Jadwal berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
