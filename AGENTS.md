# AGENTS.md — assistent

## Tech
- Node.js **ESM** (`"type": "module"`). Use `import`, not `require`.
- Entrypoint: `index.js` (imports `src/bot.js`). Run: `node index.js`.
- `src/` — modular files: config, db, helpers, state, cron, bot + `src/handlers/` (help, kategori, tabungan, riwayat, jadwal, transaksi, commabased).
- Router: `src/handlers/index.js` dispatches commands. Add new features by adding a handler file and registering it there.
- No tests, lint, format, CI, or TS config. No build step.

## Env (.env)
Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
Optional: `MY_JID` (defaults to `6287882755480@s.whatsapp.net`).

## WhatsApp (Baileys v7)
- Auth stored in `auth_info_baileys/` dir (multi-file state). **Do not commit** — `.gitignore` now excludes it.
- Auto-reconnects unless `loggedOut` disconnect.
- Logger level: `'silent'` — set to `'debug'` in `makeWASocket({...})` to troubleshoot.

## Supabase schema (inferred from code)
- `dompet` — single row (id=1), columns: `id`, `saldo`
- `transaksi` — columns: `id`, `kategori`, `keterangan`, `nominal`, `created_at`
- `kategori_custom` — columns: `id`, `nama_kategori`, `tipe`, `saldo`
- `jadwal` — columns: `id`, `kegiatan`, `tanggal`, `jam`

## Notable command quirks
- `catat <kategori> <nominal>` / `tambah <kategori> <nominal>` — multi-step if nominal omitted (asks). Amount > Rp1jt needs `" konfirmasi"` suffix.
- Sinonim tarik tabungan: `tarik`, `potong`, `ambil`, `kurangin`. Prefix `kurang <kategori>` juga support untuk pengeluaran & tabungan.
- Category names matched case-insensitively (`ilike`).
- Conversation state auto-expires after **2 min**.
- Interactive drill-down: `cek pengeluaran` / `cek pemasukan` / `cek tabungan` / `cek kategori` → list kategori → pilih → lihat 10 transaksi terakhir.
- `cek jadwal` = alias `cek agenda` (keduanya interactive).
- Interactive agenda: `cek agenda` → pilih hari ini/besok/kemarin/urgent → lihat daftar.
- `cek reminder` — tampilkan semua agenda dari hari ini + 7 hari ke depan.
- Comma-based `jadwal, ...` support `hari ini`/`besok`/`lusa`/`kemarin` sebagai tanggal, dan auto-correct `20.00` → `20:00`.
- Status agenda: `selesai <id>`, `batal <id>`, `tunda <id> [hari] [jam HH:MM]`. Tampilkan icon status di list.
- Cancel interactive prompt with: cancel, batal, gak jadi, kembali, back.
- Help/greeting: `halo kyy` / `help` / `menu` → tampilkan semua command.
- Greeting 2-step: `halo kyy` → sapa (selamat pagi/siang/dll) → state → ketik `command` untuk lihat panduan.
- All timezone: `Asia/Jakarta` (cron, date display).

## Running
```sh
node index.js
```
Scans QR code on first run. Subsequent runs use saved auth.
