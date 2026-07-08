# Kyy Assistant — Project Documentation

---

## 1. Nama Project

**Kyy Assistant** — Asisten pribadi (keuangan & produktivitas) berbasis WhatsApp Bot + Dashboard Web.

---

## 2. Ini Project Apa?

Sebuah **personal finance & productivity assistant** yang dikendalikan via **chat WhatsApp** (mencatat transaksi, mengelola kategori, mengatur jadwal/agenda) dan dilengkapi **Web Dashboard** (Next.js) untuk visualisasi data & administrasi.

User utama: **Tuan Zidane** (single-user, bukan multi-user). Bot hanya merespon satu nomor WhatsApp yang dikonfigurasi di env `MY_JID`.

---

## 3. Fungsi & Tujuan

- Mencatat **transaksi keuangan** (pemasukan, pengeluaran, tabungan) langsung dari chat WhatsApp
- Mengelola **kategori transaksi** secara dinamis (buat, rename, hapus, lihat)
- Mengatur **jadwal/agenda** harian dengan reminder otomatis
- Menyediakan **dashboard web** untuk melihat statistik, CRUD transaksi, kategori, dan jadwal
- Bot mengirim **pengingat pagi** otomatis setiap jam 07:00 WIB untuk agenda hari itu

---

## 4. Stack Teknologi

| Layer | Teknologi | Versi |
|---|---|---|
| **Runtime** | Node.js (ESM — `"type": "module"`) | ≥18 |
| **WhatsApp Bot** | `@whiskeysockets/baileys` | v7 (multi-file auth state) |
| **Database** | Supabase (PostgreSQL) | — |
| **API Server** | Express.js | v4 |
| **Auth API** | JSON Web Token (JWT) | — |
| **Dashboard** | Next.js + React + TypeScript | Next 16, React 19 |
| **UI Framework** | Tailwind CSS | v4 |
| **UI Components** | Headless UI, react-hot-toast, next-themes | — |
| **Charts** | Recharts | — |
| **Cron Job** | node-cron (internal, tanpa external scheduler) | — |
| **QR Scanner** | qrcode-terminal | — |
| **Logger** | pino | — |

---

## 5. Struktur Folder

```
assistent/
├── .env                          # Root env: SUPABASE_URL, SUPABASE_ANON_KEY, MY_JID
├── .gitignore
├── AGENTS.md                     # Panduan untuk AI agent (opencode)
├── index.js                      # Entry point (import & start bot)
├── opencode.json                 # Konfigurasi opencode AI
├── package.json                  # Dependencies bot
├── project.md                    ← Dokumentasi ini
│
├── src/                          # Source code bot WhatsApp
│   ├── bot.js                    # init Baileys socket, event handlers, cron
│   ├── config.js                 # Load env + init Supabase client
│   ├── cron.js                   # Cron: kirim reminder agenda harian
│   ├── db.js                     # Fungsi database (cari kategori, transaksi, reverse)
│   ├── helpers.js                # Utility: formatRupiah, extractNominal, dll
│   ├── state.js                  # Conversation state manager (Map + timeout 2 menit)
│   └── handlers/
│       ├── index.js              # Router utama + state handler + dispatch
│       ├── help.js               # Greeting (halo kyy) + help/menu
│       ├── transaksi.js          # catat/tambah/undo/hapus transaksi
│       ├── kategori.js           # CRUD kategori
│       ├── tabungan.js           # Manajemen tabungan
│       ├── riwayat.js            # Riwayat + cek interaktif
│       ├── jadwal.js             # Agenda: cek, selesai, batal, tunda, reminder
│       └── commabased.js         # Legacy comma-format commands
│
├── auth_info_baileys/            # WhatsApp multi-file auth state (auto-generated)
│
├── server/                       # API REST (Express.js)
│   ├── .env                      # DASHBOARD_PASSWORD, JWT_SECRET, PORT
│   ├── auth.js                   # Login, change password, verify token (JWT)
│   ├── db.js                     # Supabase client (load dari root .env)
│   ├── index.js                  # Express app + route definitions
│   ├── package.json
│   └── routes/
│       ├── dompet.js             # GET/PUT /api/dompet
│       ├── jadwal.js             # CRUD /api/jadwal
│       ├── kategori.js           # CRUD /api/kategori
│       ├── stats.js              # GET /api/stats (aggregate dashboard data)
│       └── transaksi.js          # CRUD /api/transaksi
│
└── dashboard/                    # Frontend (Next.js 16 + React 19 + TypeScript)
    ├── .env.local                # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_*
    ├── next.config.ts
    ├── package.json
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    └── src/
        ├── lib/
        │   ├── api.ts            # HTTP client (fetch wrapper) untuk semua endpoint
        │   ├── auth.ts           # JWT token management (login, logout, isAuthenticated)
        │   └── utils.ts          # Utility: formatRupiah, formatDate, getGreeting, dll
        ├── components/
        │   ├── layout/
        │   │   ├── AuthGuard.tsx  # Route protection wrapper
        │   │   ├── Header.tsx     # Top bar with theme toggle & user info
        │   │   ├── Layout.tsx     # Main layout (sidebar + header + content)
        │   │   └── Sidebar.tsx    # Navigation sidebar
        │   └── ui/
        │       ├── DataTable.tsx  # Reusable table component
        │       ├── GlassCard.tsx  # Glassmorphism card wrapper
        │       ├── Modal.tsx      # Dialog modal (Headless UI)
        │       └── StatCard.tsx   # Stats display card
        ├── pages/
        │   ├── _app.tsx           # App wrapper (ThemeProvider, Toaster)
        │   ├── _document.tsx      # HTML document structure
        │   ├── index.tsx          # Login page
        │   └── dashboard/
        │       ├── index.tsx      # Home: stat cards + charts + transaksi terbaru
        │       ├── transaksi/
        │       │   └── index.tsx  # CRUD transaksi + filter + search + pagination
        │       ├── kategori.tsx   # CRUD kategori + grouped display
        │       ├── jadwal.tsx     # CRUD jadwal + filter status + quick actions
        │       └── pengaturan.tsx # Theme toggle + ganti password + info
        └── styles/
            └── globals.css        # Tailwind v4 + glassmorphism custom styles
```

---

## 6. Fitur Lengkap

### ✅ WhatsApp Bot (Sudah Dibuat & Fungsional)

#### Transaksi Keuangan
| Perintah | Keterangan |
|---|---|
| `catat <kategori> <nominal>` | Catat transaksi (pemasukan/pengeluaran/tabungan otomatis) |
| `catat <kategori>` | Multi-step: bot tanya nominal |
| `tambah <kategori> <nominal>` | Sama seperti catat |
| `kurang <kategori> <nominal>` | Universal reduce — untuk pengeluaran & tabungan |
| `tabungan <nama> masuk <nominal>` | Setor ke tabungan |
| `tabungan <nama>` | Auto-detect sebagai setoran (tanpa kata kunci) |
| `tabungan <nama> keluar/tarik/potong/ambil/kurangin <nominal>` | Tarik tabungan |
| Sinonim tarik | `tarik`, `potong`, `ambil`, `kurangin` |
| `kyy undo` | Batalkan transaksi terakhir |
| `hapus transaksi <id>` | Hapus transaksi by ID |
| Konfirmasi nominal >Rp1jt | Perlu suffix `" konfirmasi"` untuk lanjut |

#### Kategori
| Perintah | Keterangan |
|---|---|
| `buat kategori baru = <nama>` | Auto-detect tipe (pengeluaran, atau tabungan jika mulai "nabung") |
| `buat kategori <tipe> = <nama>` | Explicit tipe (pemasukan/pengeluaran/tabungan) |
| `ganti nama kategori <lama> menjadi <baru>` | Rename kategori |
| `hapus kategori <nama>` | Hapus (tidak bisa jika masih punya transaksi) |
| `lihat kategori` / `daftar kategori` | Tampilkan semua kategori + saldo tabungan |

#### Cek & Lacak
| Perintah | Keterangan |
|---|---|
| `cek pengeluaran` | Interactive: list kategori pengeluaran → pilih → 10 transaksi terakhir |
| `cek pemasukan` | Interactive: list kategori pemasukan → pilih → 10 transaksi terakhir |
| `cek tabungan` | Interactive: list tabungan → pilih → 10 transaksi terakhir |
| `cek kategori` | Interactive: semua kategori → pilih → 10 transaksi terakhir |
| `cek tabungan <nama>` | Detail saldo tabungan tertentu |
| `riwayat` | 10 transaksi terakhir |
| `riwayat <jumlah>` | N transaksi terakhir (misal: `riwayat 20`) |
| `riwayat minggu ini` | Transaksi minggu ini |
| `riwayat bulan ini` | Transaksi bulan ini |
| `riwayat <YYYY-MM-DD>` | Transaksi tanggal tertentu |
| `riwayat <nama kategori>` | Transaksi per kategori |
| `tempat <kategori>` | Transaksi kategori hari ini |
| `tempat <kategori> kemarin/besok` | Transaksi kategori per hari tertentu |

#### Jadwal & Agenda
| Perintah | Keterangan |
|---|---|
| `jadwal, <kegiatan>, <tanggal>, <jam>` | Format koma — buat jadwal baru |
| `jadwal, <kegiatan>, hari ini/besok/lusa/kemarin, <jam>` | Support kata relatif |
| Auto-correct jam | `20.00` otomatis jadi `20:00` |
| `cek agenda` / `cek jadwal` | Interactive: pilih hari ini/besok/kemarin/urgent |
| `cek reminder` | Semua agenda hari ini + 7 hari ke depan |
| `selesai <id>` | Tandai agenda selesai ✅ |
| `batal <id>` | Tandai agenda batal ❌ |
| `tunda <id> [hari] [jam HH:MM]` | Tunda agenda + ubah tanggal/jam |
| `cancel jadwal <id>` / `hapus jadwal <id>` | Hapus jadwal permanent |
| **Reminder otomatis** | Cron jam 07:00 WIB kirim semua agenda hari ini |

#### Legacy (Comma-based)
| Perintah | Keterangan |
|---|---|
| `pemasukan, <keterangan>, <nominal>` | Format koma — catat pemasukan |
| `pengeluaran, <keterangan>, <nominal>` | Format koma — catat pengeluaran |
| `urgent, <keterangan>, <nominal>` | Sama seperti pengeluaran |

#### Help & Interaksi
| Perintah | Keterangan |
|---|---|
| `halo kyy` / `hai kyy` / `pagi kyy` / dll | Greeting 2-step: sapa → state → ketik `command` untuk panduan |
| `help` / `menu` / `bantuan` | Tampilkan semua command |
| `cancel` / `batal` / `gak jadi` / `kembali` / `back` | Batalkan interactive prompt |

#### Sistem
| Fitur | Keterangan |
|---|---|
| Conversation state | Auto-expire 2 menit |
| Debounce | Cegah loop pesan duplikat (800ms threshold) |
| Timezone | Semua `Asia/Jakarta` |
| Reconnect otomatis | Ya, kecuali `loggedOut` |

---

### ✅ API Server (Sudah Dibuat)

| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/api/auth/login` | POST | — | Login dengan password → JWT token |
| `/api/auth/password` | PUT | JWT | Ganti password |
| `/api/stats` | GET | JWT | Aggregate data untuk dashboard |
| `/api/dompet` | GET | JWT | Lihat saldo dompet |
| `/api/dompet` | PUT | JWT | Update dompet (saldo, target_wishlist, nominal_wishlist) |
| `/api/transaksi` | GET | JWT | List transaksi (pagination, filter, search) |
| `/api/transaksi` | POST | JWT | Buat transaksi baru (auto-update dompet/kategori) |
| `/api/transaksi/:id` | PUT | JWT | Update transaksi (reverse + apply baru) |
| `/api/transaksi/:id` | DELETE | JWT | Hapus transaksi (reverse) |
| `/api/kategori` | GET | JWT | List semua kategori |
| `/api/kategori` | POST | JWT | Buat kategori baru |
| `/api/kategori/:id` | PUT | JWT | Update kategori (nama, tipe, saldo) |
| `/api/kategori/:id` | DELETE | JWT | Hapus kategori (cek transaksi terkait) |
| `/api/jadwal` | GET | JWT | List jadwal (filter status, tanggal) |
| `/api/jadwal` | POST | JWT | Buat jadwal baru |
| `/api/jadwal/:id` | PUT | JWT | Update jadwal (kegiatan, tanggal, jam, status) |
| `/api/jadwal/:id` | DELETE | JWT | Hapus jadwal |

---

### ✅ Dashboard Web (Sudah Dibuat)

| Halaman | Route | Fitur |
|---|---|---|
| **Login** | `/` | Form password -> JWT -> redirect ke dashboard |
| **Beranda** | `/dashboard` | Stat cards (saldo, tabungan, pengeluaran, agenda), bar chart, pie chart, transaksi terbaru |
| **Transaksi** | `/dashboard/transaksi` | CRUD + filter tipe/kategori + search keterangan + pagination |
| **Kategori** | `/dashboard/kategori` | CRUD + grouped by tipe + display saldo tabungan |
| **Jadwal** | `/dashboard/jadwal` | CRUD + filter status + quick actions (✅❌⏳🗑️) |
| **Pengaturan** | `/dashboard/pengaturan` | Dark/light theme toggle + ganti password + info bot |

---

### Database Schema (Supabase)

**Tabel `dompet`** — single row (id=1)
| Column | Type | Keterangan |
|---|---|---|
| `id` | int8 | Primary key (always 1) |
| `saldo` | int8 | Saldo utama |
| `target_wishlist` | text | (belum dipakai) |
| `nominal_wishlist` | int8 | (belum dipakai) |

**Tabel `transaksi`**
| Column | Type | Keterangan |
|---|---|---|
| `id` | int8 | Primary key |
| `kategori` | text | Nama kategori (string, bukan FK) |
| `keterangan` | text | Deskripsi transaksi |
| `nominal` | int8 | Jumlah nominal |
| `created_at` | timestamptz | Auto-generated |

**Tabel `kategori_custom`**
| Column | Type | Keterangan |
|---|---|---|
| `id` | int8 | Primary key |
| `nama_kategori` | text | Unique (case-insensitive query via `ilike`) |
| `tipe` | text | `pemasukan` / `pengeluaran` / `tabungan` |
| `saldo` | int8 | Khusus tipe `tabungan` |

**Tabel `jadwal`**
| Column | Type | Keterangan |
|---|---|---|
| `id` | int8 | Primary key |
| `kegiatan` | text | Nama kegiatan |
| `tanggal` | date | Tanggal |
| `jam` | time | Jam |
| `status` | text | `pending` / `selesai` / `batal` / `ditunda` |

---

## 7. Yang SUDAH Dibuat ✅

- [x] WhatsApp bot fully functional dengan Baileys v7 (multi-file auth, QR login, auto-reconnect)
- [x] Semua handler command: transaksi, kategori, tabungan, riwayat, jadwal, help, comma-based
- [x] Conversation state management (Map-based, 2 menit timeout, cancel support)
- [x] Cron reminder otomatis jam 07:00 WIB
- [x] Express API server (CRUD semua entitas + JWT auth)
- [x] Dashboard Next.js 16 + React 19 (5 halaman: login, beranda, transaksi, kategori, jadwal, pengaturan)
- [x] Glassmorphism UI dengan dark/light theme
- [x] Integrasi Supabase untuk semua entitas
- [x] Reverse transaksi (undo) dengan koreksi saldo
- [x] Interactive drill-down (cek pengeluaran/pemasukan/tabungan/kategori)
- [x] Status agenda: selesai, batal, tunda
- [x] Kompatibilitas format legacy (format koma)
- [x] Debounce untuk cegah loop pesan
- [x] Konfirmasi nominal besar (>Rp1jt)

---

## 8. Yang BELUM Dibuat / Perlu Pengerjaan ❌

| # | Item | Prioritas | Detail |
|---|---|---|---|
| 1 | **Bug: Regex nominal tabungan** | 🔴 Tinggi | `handleTabunganCommand` line 43: `tabKeluarMatch[2]` seharusnya `tabKeluarMatch[3]` — nominal parsing salah untuk `tabungan <nama> keluar <nominal>` |
| 2 | **Data dummy chart random** | 🔴 Tinggi | Dashboard beranda menggunakan `Math.random()` untuk data bulan -5 sampai -3. Harus diganti dengan real historical queries. |
| 3 | **Rate limiter API** | 🟡 Sedang | Server Express tidak punya rate limiting, rentan spam/abuse. |
| 4 | **Error tracking & logging** | 🟡 Sedang | Tidak ada sistem logging terpusat. Hanya `console.error` di beberapa tempat. |
| 5 | **Reverse transaksi tabungan rentan bug** | 🟡 Sedang | Pengecekan string "penarikan" via `.includes()` di `reverseTransaksi` sangat rentan false positive/negative. |
| 6 | **Multi-user support** | 🟡 Sedang | MY_JID hardcoded di env. Bot hanya support satu user. |
| 7 | **Wishlist feature** | 🟡 Sedang | Kolom `target_wishlist` & `nominal_wishlist` sudah ada di schema & API dompet, tapi tidak dipakai di bot WA maupun dashboard. |
| 8 | **Notifikasi mendekati waktu agenda** | 🟡 Sedang | Bot hanya kirim reminder pagi, tidak ada notifikasi H-1 atau H+0 beberapa menit sebelum jam agenda. |
| 9 | **Export data** | 🟢 Rendah | Tidak ada export transaksi ke CSV/Excel (bot maupun dashboard). |
| 10 | **Search/pencarian global** | 🟢 Rendah | Bot WA tidak punya fitur "cari transaksi" atau "cari jadwal" global. |
| 11 | **Dokumentasi API** | 🟢 Rendah | Tidak ada Swagger/OpenAPI spec untuk REST API. |
| 12 | **Testing** | 🟢 Rendah | Tidak ada unit test / integration test sama sekali. |
| 13 | **Deployment config** | 🟢 Rendah | Tidak ada Dockerfile, docker-compose, atau PM2 config. |
| 14 | **Backup system** | 🟢 Rendah | Tidak ada backup data otomatis. |
| 15 | **CLI / maintenance tools** | 🟢 Rendah | Tidak ada script untuk reset data, migrate, seed. |
| 16 | **Mobile optimization dashboard** | 🟢 Rendah | Sidebar & tabel belum fully optimized untuk mobile. |
| 17 | **Default value kolom `status` di `jadwal`** | 🟢 Rendah | Tidak ada default di schema, rentan NULL. |
| 18 | **Internationalization (i18n)** | 🟢 Rendah | Semua teks hardcoded dalam Bahasa Indonesia. |

---

## 9. Cara Menjalankan

```bash
# 1. Install dependencies bot utama
npm install

# 2. Install dependencies API server
cd server && npm install && cd ..

# 3. Install dependencies dashboard
cd dashboard && npm install && cd ..

# 4. Pastikan .env sudah diisi (Supabase credentials + MY_JID)

# 5. Jalankan bot WhatsApp
node index.js
# -> Scan QR code di terminal pada first run

# 6. (Opsional) Jalankan API server
cd server && node index.js

# 7. (Opsional) Jalankan dashboard
cd dashboard && npm run dev
# -> Buka http://localhost:3000
```

---

*Dokumentasi ini digenerate otomatis dari audit kode sumber — 7 Juli 2026.*
