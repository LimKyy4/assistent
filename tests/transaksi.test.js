import { describe, it, expect } from 'vitest';

/**
 * Test the setoran/penarikan detection logic used in reverseTransaksi
 * and server deleteTransaksi/updateTransaksi.
 *
 * The pattern used in src/db.js:
 *   const keterangan = (trx.keterangan || '').toLowerCase();
 *   const isSetoran = keterangan.startsWith('setoran') || !keterangan;
 */

function isSetoran(keterangan) {
  const k = (keterangan || '').toLowerCase();
  return k.startsWith('setoran') || !k;
}

describe('setoran detection (reverse transaksi)', () => {
  it('detects "Setoran tabungan" as setoran', () => {
    expect(isSetoran('Setoran tabungan')).toBe(true);
  });

  it('detects empty keterangan as setoran', () => {
    expect(isSetoran('')).toBe(true);
    expect(isSetoran(null)).toBe(true);
    expect(isSetoran(undefined)).toBe(true);
  });

  it('detects "Penarikan tabungan" as NOT setoran', () => {
    expect(isSetoran('Penarikan tabungan')).toBe(false);
  });

  it('detects custom setoran text', () => {
    expect(isSetoran('Setoran darurat')).toBe(true);
  });

  it('detects custom penarikan text', () => {
    expect(isSetoran('Penarikan darurat')).toBe(false);
    expect(isSetoran('Tarik tunai')).toBe(false);
    expect(isSetoran('Ambil uang')).toBe(false);
  });
});
