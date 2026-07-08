import { getToken } from './auth';
import type {
  StatsResponse,
  TransaksiResponse,
  TransaksiItem,
  KategoriItem,
  JadwalItem,
  DompetItem,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Stats ──
export const getStats = (): Promise<StatsResponse> => request<StatsResponse>('/stats');

// ── Dompet ──
export const getDompet = (): Promise<DompetItem> => request<DompetItem>('/dompet');
export const updateDompet = (data: Partial<DompetItem>): Promise<DompetItem> =>
  request<DompetItem>('/dompet', { method: 'PUT', body: JSON.stringify(data) });

// ── Transaksi ──
export const getTransaksi = (params: Record<string, string | number | undefined> = {}): Promise<TransaksiResponse> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  return request<TransaksiResponse>(`/transaksi?${qs.toString()}`);
};
export const createTransaksi = (data: Partial<TransaksiItem>): Promise<TransaksiItem> =>
  request<TransaksiItem>('/transaksi', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaksi = (id: number, data: Partial<TransaksiItem>): Promise<TransaksiItem> =>
  request<TransaksiItem>(`/transaksi/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransaksi = (id: number): Promise<void> =>
  request<void>(`/transaksi/${id}`, { method: 'DELETE' });

// ── Kategori ──
export const getKategori = (): Promise<KategoriItem[]> => request<KategoriItem[]>('/kategori');
export const createKategori = (data: Partial<KategoriItem>): Promise<KategoriItem> =>
  request<KategoriItem>('/kategori', { method: 'POST', body: JSON.stringify(data) });
export const updateKategori = (id: number, data: Partial<KategoriItem>): Promise<KategoriItem> =>
  request<KategoriItem>(`/kategori/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteKategori = (id: number): Promise<void> =>
  request<void>(`/kategori/${id}`, { method: 'DELETE' });

// ── Jadwal ──
export const getJadwal = (params: Record<string, string | undefined> = {}): Promise<JadwalItem[]> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, v); });
  return request<JadwalItem[]>(`/jadwal?${qs.toString()}`);
};
export const createJadwal = (data: Partial<JadwalItem>): Promise<JadwalItem> =>
  request<JadwalItem>('/jadwal', { method: 'POST', body: JSON.stringify(data) });
export const updateJadwal = (id: number, data: Partial<JadwalItem>): Promise<JadwalItem> =>
  request<JadwalItem>(`/jadwal/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteJadwal = (id: number): Promise<void> =>
  request<void>(`/jadwal/${id}`, { method: 'DELETE' });

// ── Auth ──
export const changePassword = (oldPassword: string, newPassword: string): Promise<{ message: string }> =>
  request<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
