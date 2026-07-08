// ── Transaksi ──
export interface TransaksiItem {
  id: number;
  kategori: string;
  keterangan: string;
  nominal: number;
  created_at: string;
}

export interface TransaksiResponse {
  data: TransaksiItem[];
  total: number;
  page: number;
  total_pages: number;
}

// ── Kategori ──
export interface KategoriItem {
  id: number;
  nama_kategori: string;
  tipe: "pemasukan" | "pengeluaran" | "tabungan";
  saldo: number;
}

// ── Jadwal ──
export interface JadwalItem {
  id: number;
  kegiatan: string;
  tanggal: string;
  jam: string;
  status: "pending" | "selesai" | "batal" | "ditunda";
}

// ── Dompet ──
export interface DompetItem {
  id: number;
  saldo: number;
  target_wishlist?: string;
  nominal_wishlist?: number;
}

// ── Chart ──
export interface ChartBulanan {
  bulan: string;
  pengeluaran: number;
  pemasukan: number;
}

// ── Stats ──
export interface StatsResponse {
  saldo_dompet: number;
  total_tabungan: number;
  total_pengeluaran_bulan_ini: number;
  total_pemasukan_bulan_ini: number;
  agenda_hari_ini: number;
  transaksi_terbaru: TransaksiItem[];
  chart_bulanan: ChartBulanan[];
}
