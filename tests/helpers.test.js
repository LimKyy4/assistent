import { describe, it, expect } from 'vitest';
import {
  formatRupiah,
  formatRupiahSingkat,
  extractNominal,
  extractNominalWithIndex,
  bersihkanNamaKategori,
  dapatkanTanggalStr,
} from '../src/helpers.js';

describe('formatRupiah', () => {
  it('formats number with Rp prefix and ID locale', () => {
    expect(formatRupiah(15000)).toBe('Rp 15.000');
  });

  it('handles zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('handles NaN', () => {
    expect(formatRupiah('abc')).toBe('Rp 0');
  });

  it('handles string number', () => {
    expect(formatRupiah('50000')).toBe('Rp 50.000');
  });
});

describe('formatRupiahSingkat', () => {
  it('formats ribuan', () => {
    expect(formatRupiahSingkat(1500)).toBe('1.5rb');
  });

  it('formats jutaan', () => {
    expect(formatRupiahSingkat(2000000)).toBe('2jt');
  });

  it('formats satuan', () => {
    expect(formatRupiahSingkat(500)).toBe('500');
  });

  it('handles NaN', () => {
    expect(formatRupiahSingkat('abc')).toBe('0');
  });
});

describe('extractNominal', () => {
  it('extracts number from string', () => {
    expect(extractNominal('beli 50000')).toBe(50000);
  });

  it('handles dotted number (Indonesia format)', () => {
    expect(extractNominal('50.000')).toBe(50000);
  });

  it('returns null when no number', () => {
    expect(extractNominal('beli makanan')).toBeNull();
  });

  it('extracts first number', () => {
    expect(extractNominal('50000 untuk makan')).toBe(50000);
  });
});

describe('extractNominalWithIndex', () => {
  it('returns nominal and index', () => {
    const result = extractNominalWithIndex('makan siang 25000');
    expect(result).toEqual({ nominal: 25000, index: 2 });
  });

  it('returns null when no number', () => {
    expect(extractNominalWithIndex('makan siang')).toBeNull();
  });

  it('handles dotted number', () => {
    const result = extractNominalWithIndex('beli 15.000');
    expect(result).toEqual({ nominal: 15000, index: 1 });
  });
});

describe('bersihkanNamaKategori', () => {
  it('removes sinonim words from category name', () => {
    expect(bersihkanNamaKategori(['makann', 'potong', '15000'], 2)).toBe('makann');
  });

  it('returns original if no sinonim found', () => {
    expect(bersihkanNamaKategori(['makan', 'siang'], 2)).toBe('makan siang');
  });

  it('handles empty filtered result', () => {
    expect(bersihkanNamaKategori(['tarik', '15000'], 1)).toBe('tarik');
  });
});

describe('dapatkanTanggalStr', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(dapatkanTanggalStr(0)).toBe(today);
  });

  it('returns tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(dapatkanTanggalStr(1)).toBe(tomorrow);
  });

  it('returns yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    expect(dapatkanTanggalStr(-1)).toBe(yesterday);
  });
});
