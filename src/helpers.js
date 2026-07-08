export function dapatkanTanggalStr(offsetHari = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetHari);
    return d.toISOString().split('T')[0];
}

export function formatRupiah(n) {
    const num = parseInt(n);
    if (isNaN(num)) return 'Rp 0';
    return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatRupiahSingkat(n) {
    const num = parseInt(n);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'rb';
    return num.toString();
}

export function extractNominal(str) {
    const tokens = str.split(/\s+/);
    for (const token of tokens) {
        const clean = token.replace(/\./g, '');
        if (/^\d+$/.test(clean)) {
            return parseInt(clean);
        }
    }
    return null;
}

export function extractNominalWithIndex(str) {
    const tokens = str.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
        const clean = tokens[i].replace(/\./g, '');
        if (/^\d+$/.test(clean)) {
            return { nominal: parseInt(clean), index: i };
        }
    }
    return null;
}

const SKIP_WORDS = ['tarik', 'potong', 'ambil', 'kurangin', 'kurang', 'keluar', 'masuk'];

/**
 * Bersihin kata-kata sinonim dari nama kategori biar gak ambigu.
 * Contoh: "makann potong 15000" → nama kategori = "makann", bukan "makann potong"
 */
export function bersihkanNamaKategori(tokens, endIndex) {
    const filtered = tokens.slice(0, endIndex).filter(t => !SKIP_WORDS.includes(t.toLowerCase()));
    return filtered.join(' ') || tokens.slice(0, endIndex).join(' ');
}
