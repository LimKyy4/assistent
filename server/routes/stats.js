import { supabase } from '../db.js';

function getMonthRange(monthsAgo) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - monthsAgo;
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { start, end };
}

function getMonthLabel(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

export async function getStats(req, res) {
    try {
        const now = new Date();
        const awalBulan = getMonthRange(0).start;
        const akhirBulan = getMonthRange(0).end;
        const hariIni = now.toISOString().split('T')[0];

        const [dompet, tabungan, agenda] = await Promise.all([
            supabase.from('dompet').select('*').eq('id', 1).single(),
            supabase.from('kategori_custom').select('saldo').eq('tipe', 'tabungan'),
            supabase.from('jadwal').select('*').eq('tanggal', hariIni)
                .neq('status', 'selesai').neq('status', 'batal'),
        ]);

        // ── 5 transaksi terbaru ──
        const { data: trxTerbaru } = await supabase
            .from('transaksi')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        // ── Chart bulanan: batch query ──
        const rangeMulai = getMonthRange(5).start;
        const rangeAkhir = getMonthRange(0).end;

        // Ambil daftar kategori untuk mapping tipe → nama kategori
        const { data: allKategori } = await supabase.from('kategori_custom').select('*');
        const pengeluaranNames = [...new Set([
            ...(allKategori || []).filter(k => k.tipe === 'pengeluaran').map(k => k.nama_kategori),
            'pengeluaran' // legacy comma-based
        ])];
        const pemasukanNames = [...new Set([
            ...(allKategori || []).filter(k => k.tipe === 'pemasukan').map(k => k.nama_kategori),
            'pemasukan' // legacy comma-based
        ])];

        const [{ data: allPengeluaran }, { data: allPemasukan }] = await Promise.all([
            supabase.from('transaksi').select('nominal, created_at')
                .in('kategori', pengeluaranNames.length > 0 ? pengeluaranNames : ['__none__'])
                .gte('created_at', rangeMulai)
                .lte('created_at', rangeAkhir),
            supabase.from('transaksi').select('nominal, created_at')
                .in('kategori', pemasukanNames.length > 0 ? pemasukanNames : ['__none__'])
                .gte('created_at', rangeMulai)
                .lte('created_at', rangeAkhir),
        ]);

        const chartBulanan = [];
        for (let i = 5; i >= 0; i--) {
            const { start, end } = getMonthRange(i);
            const label = getMonthLabel(start);

            const pengeluaran = (allPengeluaran || [])
                .filter(t => t.created_at >= start && t.created_at <= end)
                .reduce((sum, t) => sum + parseInt(t.nominal || 0), 0);

            const pemasukan = (allPemasukan || [])
                .filter(t => t.created_at >= start && t.created_at <= end)
                .reduce((sum, t) => sum + parseInt(t.nominal || 0), 0);

            chartBulanan.push({ bulan: label, pengeluaran, pemasukan });
        }

        // ── Aggregate bulan ini ──
        const totalTabungan = (tabungan.data || []).reduce((sum, t) => sum + parseInt(t.saldo || 0), 0);
        const totalPengeluaran = chartBulanan[chartBulanan.length - 1]?.pengeluaran || 0;
        const totalPemasukan = chartBulanan[chartBulanan.length - 1]?.pemasukan || 0;

        res.json({
            saldo_dompet: parseInt(dompet.data?.saldo || 0),
            total_tabungan: totalTabungan,
            total_pengeluaran_bulan_ini: totalPengeluaran,
            total_pemasukan_bulan_ini: totalPemasukan,
            agenda_hari_ini: (agenda.data || []).length,
            transaksi_terbaru: trxTerbaru || [],
            chart_bulanan: chartBulanan,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
