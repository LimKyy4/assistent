# Kyy Assistant — Dashboard UI/UX Documentation

> Dokumentasi lengkap untuk Gemini AI — seluruh source code dashboard Next.js + TypeScript.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Directory Structure](#directory-structure)
5. [Page Descriptions](#page-descriptions)
6. [Complete Source Code](#complete-source-code)

---

## Project Overview

Dashboard keuangan pribadi untuk **Kyy Assistant** — WhatsApp bot untuk mencatat pemasukan, pengeluaran, tabungan, dan jadwal.

**Fitur utama:**
- **Login** — JWT authentication, glassmorphism card, dark/light toggle
- **Beranda** — Ringkasan keuangan, live clock, 4 stat cards (mobile carousel/desktop grid), BarChart 6 bulan, PieChart distribusi, wishlist progress bar, 5 transaksi terbaru, summary bar
- **Transaksi** — 3-level drill-down (tipe → kategori → table), search, date range picker, CSV export, pagination, CRUD modal
- **Kategori** — 3-level drill-down (tipe → list → detail dengan riwayat transaksi), search, CRUD
- **Jadwal** — 2-level drill-down (status cards → table), quick actions (✅ ❌ ⏳ 🗑️), CRUD modal
- **Pengaturan** — Ganti password, wishlist form, dark/light toggle, info

---

## Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Next.js** | 15+ (Pages Router) | Framework React |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 4 (with @theme) | Utility-first CSS |
| **shadcn/ui** | latest (Radix UI) | Accessible component primitives |
| **Framer Motion** | 12+ | Animasi & page transitions |
| **Recharts** | 2+ | BarChart, PieChart, Sparkline |
| **TanStack React Query** | 5+ | Server state, caching, auto-refetch (30s) |
| **React Hook Form** | 7+ | Form handling |
| **Zod** | 3+ | Schema validation |
| **Sonner** | 2+ | Toast notifications |
| **Lucide React** | latest | Icons |
| **next-themes** | 0.4+ | Dark/light mode (class strategy) |

---

## Architecture & Data Flow

### Navigation Pattern (3-level Drill-Down)
Semua halaman data (Transaksi, Kategori, Jadwal) menggunakan pola navigasi seragam:
- **Level 0 (type/menu):** Pilih tipe — cards grid dengan gradient backgrounds + ikon + count
- **Level 1 (list):** Daftar item per tipe — cards dengan stats
- **Level 2 (detail):** Detail view — data table dengan pagination, CRUD actions

Navigasi menggunakan `AnimatePresence mode="wait"` + `pageVariants` (slide horizontal x-axis). Breadcrumb dinamis dengan back button. State navigation via React `useState` (`level`, `selectedType`, `selectedItem`).

### Data Flow Diagram
```
Browser (React / Next.js)
  │
  ├── AuthGuard (cek JWT di localStorage)
  ├── Layout + Sidebar (collapsible, nav links, dark toggle)
  │
  ├── React Query (@tanstack/react-query)
  │     ├── ["stats"]        → getStats          → refetchInterval: 30s
  │     ├── ["transaksi", q] → getTransaksi(q)   → enabled when level === "table"
  │     ├── ["kategori"]     → getKategori()
  │     ├── ["jadwal", f]    → getJadwal(f)
  │     ├── ["dompet"]       → getDompet()
  │     └── ["kategori-trx-stats"] → per-kategori stats
  │
  ├── Mutations (useMutation)
  │     ├── createTransaksi / updateTransaksi / deleteTransaksi
  │     ├── createKategori / updateKategori / deleteKategori
  │     ├── createJadwal / updateJadwal / deleteJadwal
  │     └── updateDompet (wishlist)
  │
  └── API Layer (lib/api.ts)
        └── fetch() with JWT Bearer header
              └── Express.js Server (port 3001)
                    └── Supabase (PostgreSQL)
```

### State Management Strategy
- **Server state:** React Query (caching, background refetch, mutations auto-invalidate)
- **Navigation state:** React `useState` (`level`, `selectedType`, `selectedItem`, `page`)
- **Form state:** React Hook Form (per-page + modal forms)
- **UI state:** React `useState` (modal open/close, search input)
- **Auth state:** JWT token in localStorage (checked by AuthGuard)
- **Theme state:** next-themes (class-based, persisted)

---

## Directory Structure

```
dashboard/src/
├── styles/
│   └── globals.css              # Tailwind theme, CSS vars, glassmorphism, keyframes
├── pages/
│   ├── _document.tsx             # HTML shell lang="id"
│   ├── _app.tsx                  # Providers (QueryClient, ThemeProvider, Toaster)
│   ├── index.tsx                 # Login page
│   └── dashboard/
│       ├── index.tsx             # Beranda (home)
│       ├── jadwal.tsx            # Agenda
│       ├── kategori.tsx          # Kategori
│       ├── pengaturan.tsx        # Pengaturan
│       └── transaksi/
│           └── index.tsx         # Transaksi
├── components/
│   ├── layout/
│   │   ├── AuthGuard.tsx         # Auth redirect wrapper
│   │   ├── Layout.tsx            # Sidebar + main content
│   │   └── Sidebar.tsx           # Navigation sidebar
│   └── ui/
│       ├── alert-dialog.tsx      # shadcn AlertDialog
│       ├── AnimatedCounter.tsx   # Animated number
│       ├── badge.tsx             # shadcn Badge
│       ├── button.tsx            # shadcn Button
│       ├── calendar.tsx          # shadcn Calendar (date-fns)
│       ├── card.tsx              # shadcn Card
│       ├── DataTable.tsx         # Sortable responsive table
│       ├── DateRangePicker.tsx   # Calendar range picker
│       ├── dialog.tsx            # shadcn Dialog
│       ├── dropdown-menu.tsx     # shadcn DropdownMenu
│       ├── EmptyState.tsx        # Empty state placeholder
│       ├── GlassCard.tsx         # Glassmorphism card wrapper
│       ├── input.tsx             # shadcn Input
│       ├── Modal.tsx             # Animated modal
│       ├── popover.tsx           # shadcn Popover
│       ├── progress.tsx          # shadcn Progress
│       ├── select.tsx            # shadcn Select
│       ├── separator.tsx         # shadcn Separator
│       ├── sheet.tsx             # shadcn Sheet (mobile drawer)
│       ├── sidebar.tsx           # shadcn Sidebar framework
│       ├── skeleton.tsx          # shadcn Skeleton
│       ├── Sparkline.tsx         # Mini line chart
│       ├── StatCard.tsx          # Stat card with trend
│       ├── table.tsx             # shadcn Table
│       └── tooltip.tsx           # shadcn Tooltip
├── hooks/
│   └── useMediaQuery.ts          # SSR-safe media query
└── lib/
    ├── api.ts                    # Fetch wrapper + all endpoints
    ├── auth.ts                   # JWT auth functions
    ├── schemas.ts                # Zod schemas
    ├── types.ts                  # TypeScript interfaces
    └── utils.ts                  # formatRupiah, cn, dates
```

---

## Page Descriptions

### 1. Login Page (`/` → `pages/index.tsx`)
- Glassmorphism centered card on gradient bg (blue-50 to purple-50)
- Password input with Zod validation + react-hook-form
- Dark/light mode toggle (Sun/Moon icons)
- Skeleton loading during auth check
- Auto-redirect to `/dashboard` if JWT token exists in localStorage
- Animated entrance: fade-in + slide-up (Framer Motion)

### 2. Beranda (`/dashboard` → `dashboard/index.tsx`)
**Hero Greeting:**
- Dynamic greeting: "Selamat pagi/siang/sore/malam, Tuan Zidane" (based on hour)
- Live clock WIB (updates every second, toLocaleString id-ID)
- Emoji indicator (🌅 ☀️ 🌆 🌙)
- **Total Kekayaan card:** saldo + tabungan, animated counter
- Pemasukan (green, ArrowUpRight) & Pengeluaran (rose, ArrowDownRight) bulan ini
- Gradient background with animated pulse

**Stat Cards (4):**
- **Mobile:** horizontal scroll carousel with snap + scroll dots indicator
- **Desktop:** 2-col (md) / 4-col (lg) grid
- Cards: Saldo Dompet (emerald), Total Tabungan (amber), Pengeluaran (rose), Agenda Hari Ini (indigo)
- Each: icon, label, formatted value, trend sparkline (Recharts), gradient bg

**Charts (2-col grid, responsive):**
- 📊 BarChart (Recharts): Pengeluaran 6 Bulan, custom tooltip Rupiah
- 🥧 PieChart (Recharts): Distribusi Keuangan (Pengeluaran, Tabungan, Sisa Dompet)
- Empty state: "Belum ada data"

**Wishlist (conditional):**
- Only if wishlist target & nominal set in dompet table
- Progress bar with percentage

**Transaksi Terbaru (last 5):**
- Per row: icon (green down / rose up), keterangan, kategori + timestamp, nominal with sign
- "Lihat semua" → link to `/dashboard/transaksi`

**Summary Bar:**
- Compact glass card: Pemasukan | Pengeluaran | Tabungan (colored dots)

### 3. Transaksi (`/dashboard/transaksi` → `transaksi/index.tsx`)
**3-Level Drill-Down:**
- **L0 — Type Selection:** Pemasukan, Pengeluaran, Tabungan, Semua (cards with count + gradient)
- **L1 — Category List:** Per-tipe categories with transaction count
- **L2 — Data Table:** Sortable, 20 per page

**Filters (L2 only):**
- Search input (keterangan)
- Date range picker (Calendar-based Popover)
- Category filter (via drill-down)

**Features:**
- CSV export (client-side, BOM for Excel UTF-8)
- DataTable columns: Tanggal, Kategori (badge), Keterangan, Nominal (colored), Aksi (✏️ 🗑️)
- Pagination with prev/next buttons
- CRUD modal: Kategori (Select), Keterangan (Input), Nominal (number)
- Delete confirmation AlertDialog
- Breadcrumb with back navigation
- Filter pills horizontal scroll on mobile

### 4. Kategori (`/dashboard/kategori` → `kategori.tsx`)
**3-Level Drill-Down:**
- **L0 — Type Selection:** Pemasukan, Pengeluaran, Tabungan (icon cards with count + total saldo)
  - Quick stats bar: total kategori, tabungan saldo, total transaksi
  - "Semua Kategori" searchable grid (client-side filter)
- **L1 — Category List:** Per-tipe, cards with transaction count + last transaction date
  - Staggered entrance animation (50ms delay per card)
- **L2 — Detail:** Category header info + transaction history table (10 per page, paginated)
  - Edit/delete action buttons

### 5. Jadwal (`/dashboard/jadwal` → `jadwal.tsx`)
**2-Level Drill-Down:**
- **L0 — Status Cards (5):** Pending ⏰ (blue), Selesai ✅ (emerald), Batal ❌ (rose), Ditunda ⏳ (amber), Semua 📋
  - Count per status, disabled (opacity-50) when 0
  - Hover glow effect
  - Quick stats bar
- **L1 — Data Table:** Filterable by status pills
  - Columns: icon, kegiatan, tanggal, jam, status badge, aksi (✅ ❌ ⏳ 🗑️)
  - CRUD modal: kegiatan, tanggal (date), jam (time)

### 6. Pengaturan (`/dashboard/pengaturan` → `pengaturan.tsx`)
- 🎨 Tampilan: Dark/Light toggle button
- 🎯 Wishlist: target name input, nominal input, progress bar, save
- 🔒 Change Password: old, new, confirm
- 📋 Info: version, API URL, status

---

## Shared UI Patterns

### Glassmorphism (GlassCard)
Custom CSS properties: `--glass-bg`, `--glass-border`, `--glass-shadow`. Variabel dark mode menggelapkan alpha. Digunakan di semua card wrapper.

### Animasi (Framer Motion)
- **Page transitions:** `AnimatePresence mode="wait"` + slide horizontal (x: ±20)
- **Staggered entrance:** `containerVariants` (staggerChildren: 0.08) + `itemVariants` (y: 20)
- **Card hover:** `hover:-translate-y-1 hover:shadow-lg` (HOVER_GLOW class)
- **Sidebar:** translateX on hover, scale(0.98) on click
- **Loading:** Skeleton pulse
- **Empty state:** Pulsing icon animation

### Responsive Design
- Mobile-first with Tailwind breakpoints (sm/md/lg)
- Mobile: horizontal scroll carousel, sheet sidebar, hidden scrollbar
- Desktop: grid layouts, fixed sidebar
- Text sizing: text-xs → sm → base

### Dark Mode
- Class-based via next-themes
- CSS variables override in `.dark` selector
- Sidebar dark-specific hover/active states
- Theme toggle in sidebar footer + login page

### Loading States (3-tier)
1. **Loading:** Skeleton matching layout
2. **Empty:** EmptyState (icon + title + description + optional action button)
3. **Error:** Toast (Sonner)

---

## Complete Source Code

Berikut seluruh source code (36 files, ~2500 baris):

### `dashboard/src/styles\globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --animate-fade-in: fade-in 0.4s ease-out forwards;
  --animate-logo-float: logo-float 3s ease-in-out infinite;
  --animate-slide-in: slide-in 0.3s ease-out forwards;
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);

  /* Glassmorphism - custom */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);

  /* Glassmorphism - custom dark */
  --glass-bg: rgba(0, 0, 0, 0.2);
  --glass-border: rgba(255, 255, 255, 0.05);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .glass-hover:hover {
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.2s ease;
  }

  .dark .glass-hover:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    transition: all 0.2s;
  }

  .sidebar-link-active {
    background: rgba(99, 102, 241, 0.2);
    color: rgb(99, 102, 241);
    font-weight: 500;
  }

  .dark .sidebar-link-active {
    color: rgb(129, 140, 248);
  }

  .sidebar-link-inactive {
    color: rgb(75, 85, 99);
  }

  .dark .sidebar-link-inactive {
    color: rgb(156, 163, 175);
  }

  .sidebar-link-inactive:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .dark .sidebar-link-inactive:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  /* Sidebar micro-interactions */
  .sidebar-item {
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }

  .sidebar-item:hover {
    transform: translateX(2px);
  }

  .sidebar-item:active {
    transform: translateX(1px) scale(0.98);
  }

  .sidebar-item-active {
    border-left: 2px solid hsl(var(--primary));
    background: hsl(var(--primary) / 0.08);
    font-weight: 500;
  }

  .sidebar-item-active::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, hsl(var(--primary) / 0.05), transparent);
    pointer-events: none;
    border-radius: inherit;
  }

  .sidebar-item-active:hover {
    transform: none;
  }

  .dark .sidebar-item-active {
    background: hsl(var(--primary) / 0.12);
  }
}

/* Keyframes */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
```

---

### `dashboard/src/pages\_document.tsx`

```tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>K</text></svg>" />
      </Head>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

### `dashboard/src/pages\_app.tsx`

```tsx
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 menit cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

### `dashboard/src/pages\index.tsx`

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { login, isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/schemas";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { z } from "zod";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (isAuthenticated()) router.push("/dashboard"); }, [router]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    const ok = await login(data.password);
    setLoading(false);
    if (ok) {
      toast.success("Selamat datang kembali, Tuan Zidane!");
      router.push("/dashboard");
    } else {
      toast.error("Password salah!");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="w-full glass border-0 shadow-none">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Kyy Assistant
              </CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Password Dashboard</label>
                  <Input type="password" {...form.register("password")} placeholder="Masukkan password..." autoFocus />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  Masuk
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
```

---

### `dashboard/src/pages\dashboard\index.tsx`

```tsx
import { useEffect, useState, useRef } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Layout from "@/components/layout/Layout";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import EmptyState from "@/components/ui/EmptyState";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { getStats, getDompet } from "@/lib/api";
import { cn, formatRupiah, formatRupiahSingkat, formatDateTime, getGreeting } from "@/lib/utils";
import type { DompetItem, TransaksiItem } from "@/lib/types";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  PiggyBank,
  TrendingDown,
  CalendarCheck,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const statData = [
  { key: "saldo", icon: Wallet, label: "Saldo Dompet", color: "from-emerald-500 to-teal-600", trendColor: "#10b981" },
  { key: "tabungan", icon: PiggyBank, label: "Total Tabungan", color: "from-amber-500 to-orange-600", trendColor: "#f59e0b" },
  { key: "pengeluaran", icon: TrendingDown, label: "Pengeluaran", color: "from-rose-500 to-pink-600", trendColor: "#f43f5e" },
  { key: "agenda", icon: CalendarCheck, label: "Agenda Hari Ini", color: "from-indigo-500 to-purple-600", trendColor: "#6366f1" },
];

export default function DashboardPage() {
  const [wishlist, setWishlist] = useState<Partial<DompetItem>>({});
  const [greeting, setGreeting] = useState("");
  const [clock, setClock] = useState("");
  const [activeScrollIdx, setActiveScrollIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGreeting(getGreeting());
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
      }));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    getDompet().then(setWishlist).catch(() => {});
  }, []);

  const chartData = stats?.chart_bulanan || [];
  const totalKekayaan = (stats?.saldo_dompet || 0) + (stats?.total_tabungan || 0);
  const totalPie = [
    { name: "Pengeluaran", value: stats?.total_pengeluaran_bulan_ini || 0 },
    { name: "Tabungan", value: stats?.total_tabungan || 0 },
    { name: "Sisa Dompet", value: Math.max(0, (stats?.saldo_dompet || 0) - (stats?.total_pengeluaran_bulan_ini || 0)) },
  ].filter((d) => d.value > 0);

  const wishlistProgress = wishlist.nominal_wishlist && wishlist.nominal_wishlist > 0
    ? Math.min(100, Math.round(((stats?.saldo_dompet || 0) / wishlist.nominal_wishlist) * 100))
    : 0;

  const trendPengeluaran = chartData.map((d) => d.pengeluaran);

  // Stat values
  const getStatValue = (key: string) => {
    switch (key) {
      case "saldo": return stats?.saldo_dompet || 0;
      case "tabungan": return stats?.total_tabungan || 0;
      case "pengeluaran": return stats?.total_pengeluaran_bulan_ini || 0;
      case "agenda": return stats?.agenda_hari_ini || 0;
      default: return 0;
    }
  };

  const getStatTrend = (key: string) => key === "pengeluaran" ? trendPengeluaran : undefined;

  const getStatSubtext = (key: string) => {
    if (key === "pengeluaran") return "6 bulan terakhir";
    if (key === "agenda") return stats?.agenda_hari_ini ? `${stats.agenda_hari_ini} kegiatan` : "Santai aja ✨";
    return undefined;
  };

  const getStatFormat = (key: string) => key === "agenda" ? (n: number) => String(n) : formatRupiah;

  // Scroll indicator
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.scrollWidth * statData.length);
    setActiveScrollIdx(Math.min(idx, statData.length - 1));
  };

  // -- Skeleton Loading --
  if (isLoading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="space-y-6 animate-pulse">
            <Skeleton className="h-36 sm:h-40 w-full rounded-2xl" />
            <div className="flex md:hidden gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-[75vw] shrink-0 rounded-2xl" />
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-60 sm:h-72 rounded-2xl" />
              <Skeleton className="h-60 sm:h-72 rounded-2xl" />
            </div>
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-5 sm:space-y-6"
        >
          {/* ── Hero Greeting ── */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="relative overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-xl md:text-2xl font-bold text-foreground flex items-center gap-1.5 sm:gap-2">
                        <Sparkles className="size-4 sm:size-5 text-amber-500 shrink-0" />
                        <span className="truncate">Selamat {greeting}, Tuan Zidane</span>
                      </h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{clock} WIB</p>
                    </div>
                    <span className="text-2xl sm:text-3xl md:text-4xl shrink-0">
                      {greeting === "pagi" ? "🌅" : greeting === "siang" ? "☀️" : greeting === "sore" ? "🌆" : "🌙"}
                    </span>
                  </div>

                  {/* Total Kekayaan */}
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      💰 Total Kekayaan
                    </p>
                    <AnimatedCounter
                      value={totalKekayaan}
                      format={formatRupiah}
                      className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-1"
                    />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="size-3 text-emerald-500 shrink-0" />
                        Pemasukan: {formatRupiah(stats?.total_pemasukan_bulan_ini || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDownRight className="size-3 text-rose-500 shrink-0" />
                        Pengeluaran: {formatRupiah(stats?.total_pengeluaran_bulan_ini || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* ── Stat Cards — Mobile: Carousel, Desktop: Grid ── */}
          <motion.div variants={itemVariants}>
            {/* Mobile: horizontal scroll carousel */}
            <div className="md:hidden">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-2"
              >
                {statData.map((s) => (
                  <div key={s.key} className="snap-start shrink-0 w-[75vw] max-w-[280px]">
                    <StatCard
                      icon={s.icon}
                      label={s.label}
                      value={getStatValue(s.key)}
                      format={getStatFormat(s.key)}
                      color={s.color}
                      trend={getStatTrend(s.key)}
                      trendColor={s.trendColor}
                      subtext={getStatSubtext(s.key)}
                    />
                  </div>
                ))}
              </div>
              {/* Scroll dots */}
              <div className="flex justify-center gap-1.5 mt-1">
                {statData.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollRef.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "start" })}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === activeScrollIdx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    )}
                    aria-label={`Go to card ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop: grid 4 kolom — card pertama lebih besar */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statData.map((s, i) => (
                <StatCard
                  key={s.key}
                  icon={s.icon}
                  label={s.label}
                  value={getStatValue(s.key)}
                  format={getStatFormat(s.key)}
                  color={s.color}
                  trend={getStatTrend(s.key)}
                  trendColor={s.trendColor}
                  subtext={getStatSubtext(s.key)}
                  delay={i * 0.1}
                />
              ))}
            </div>
          </motion.div>

          {/* ── Charts ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <GlassCard>
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <span>📊</span> Pengeluaran 6 Bulan
              </h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--popover-foreground)", fontSize: "12px" }}
                      formatter={(value: any) => formatRupiah(Number(value) || 0)}
                    />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#6366f1" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center">
                  <EmptyState icon="📊" title="Belum ada data" description="Transaksi akan muncul di sini" />
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <span>🥧</span> Distribusi Keuangan
              </h3>
              {totalPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={totalPie}
                      cx="50%" cy="50%" outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatRupiahSingkat(value)}`}
                      animationDuration={800}
                    >
                      {totalPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatRupiah(value)} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center">
                  <EmptyState icon="📊" title="Belum ada data keuangan" description="Mulai catat transaksi untuk melihat distribusi" />
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* ── Wishlist ── */}
          {wishlist.target_wishlist && (wishlist.nominal_wishlist || 0) > 0 && (
            <motion.div variants={itemVariants}>
              <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    🎯 {wishlist.target_wishlist}
                  </h3>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {formatRupiah(stats?.saldo_dompet || 0)} / {formatRupiah(wishlist.nominal_wishlist || 0)}
                  </span>
                </div>
                <Progress value={wishlistProgress} className="h-2 sm:h-2.5 transition-all duration-1000" />
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{wishlistProgress}% tercapai</p>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Recent Transactions ── */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                  <span>📋</span> Transaksi Terbaru
                </h3>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href="/dashboard/transaksi" />} className="gap-1 text-xs">
                  Lihat semua <ChevronRight className="size-3" />
                </Button>
              </div>
              {stats?.transaksi_terbaru && stats.transaksi_terbaru.length > 0 ? (
                <div className="divide-y divide-border">
                  {stats.transaksi_terbaru.map((trx: TransaksiItem) => {
                    const isPenarikan = (trx.keterangan || "").toLowerCase().includes("penarikan") || (trx.keterangan || "").toLowerCase().includes("tarik");
                    const jenis = isPenarikan ? "keluar" : "masuk";
                    return (
                      <div key={trx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 min-h-[52px]">
                        <div className={cn(
                          "flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full",
                          jenis === "masuk" ? "bg-emerald-500/10" : "bg-rose-500/10"
                        )}>
                          {jenis === "masuk" ? (
                            <ArrowDownRight className={cn("size-4 sm:size-4.5", "text-emerald-600 dark:text-emerald-400")} />
                          ) : (
                            <ArrowUpRight className={cn("size-4 sm:size-4.5", "text-rose-600 dark:text-rose-400")} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {trx.keterangan || trx.kategori}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {trx.kategori} • {formatDateTime(trx.created_at)}
                          </p>
                        </div>
                        <span className={cn(
                          "text-sm sm:text-base font-semibold shrink-0 ml-2",
                          jenis === "masuk" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {jenis === "masuk" ? "+" : "−"}{formatRupiah(trx.nominal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon="📭" title="Belum ada transaksi" description="Catat transaksi pertama Anda melalui WhatsApp" />
              )}
            </GlassCard>
          </motion.div>

          {/* ── Summary Bar ── */}
          <motion.div variants={itemVariants}>
            <GlassCard size="sm">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  Pemasukan: <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(stats?.total_pemasukan_bulan_ini || 0)}</strong>
                </span>
                <span className="hidden sm:inline text-muted-foreground/30">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                  Pengeluaran: <strong className="text-rose-600 dark:text-rose-400">{formatRupiah(stats?.total_pengeluaran_bulan_ini || 0)}</strong>
                </span>
                <span className="hidden sm:inline text-muted-foreground/30">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                  Tabungan: <strong className="text-amber-600 dark:text-amber-400">{formatRupiah(stats?.total_tabungan || 0)}</strong>
                </span>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </Layout>
    </AuthGuard>
  );
}
```

---

### `dashboard/src/pages\dashboard\jadwal.tsx`

```tsx
import { useState, useMemo } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Layout from "@/components/layout/Layout";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getJadwal, createJadwal, updateJadwal, deleteJadwal } from "@/lib/api";
import { cn, todayStr } from "@/lib/utils";
import { jadwalSchema, type JadwalFormData } from "@/lib/schemas";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import type { JadwalItem } from "@/lib/types";

// ── Constants ──
const STATUS_META: Record<string, { icon: string; label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: "⏰", label: "Pending", badgeVariant: "default" },
  selesai: { icon: "✅", label: "Selesai", badgeVariant: "outline" },
  batal: { icon: "❌", label: "Batal", badgeVariant: "destructive" },
  ditunda: { icon: "⏳", label: "Ditunda", badgeVariant: "secondary" },
};

const STATUS_GRADIENTS: Record<string, string> = {
  pending: "bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20",
  selesai: "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
  batal: "bg-gradient-to-br from-rose-500/10 to-red-500/5 border-rose-500/20",
  ditunda: "bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20",
};

const STATUS_ICON: Record<string, string> = { pending: "⏰", selesai: "✅", batal: "❌", ditunda: "⏳" };
const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default", selesai: "outline", batal: "destructive", ditunda: "secondary",
};

const HOVER_GLOW = "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-200";

type JadwalLevel = "status" | "table";

export default function JadwalPage() {
  const queryClient = useQueryClient();

  // ── Navigation State ──
  const [level, setLevel] = useState<JadwalLevel>("status");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // ── CRUD State ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<JadwalItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JadwalItem | null>(null);

  // ── Query ──
  const filterParam = selectedStatus || undefined;

  const { data: allJadwal = [], isLoading } = useQuery({
    queryKey: ["jadwal", filterParam],
    queryFn: () => getJadwal({ status: filterParam }),
  });

  // Count per status dari semua data (jika filter kosong)
  const { data: statsData } = useQuery({
    queryKey: ["jadwal", "stats"],
    queryFn: () => getJadwal({}),
    staleTime: 1000 * 60 * 2,
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, selesai: 0, batal: 0, ditunda: 0 };
    if (statsData) {
      statsData.forEach((j: JadwalItem) => {
        const s = j.status || "pending";
        counts[s] = (counts[s] || 0) + 1;
      });
    }
    return counts;
  }, [statsData]);

  const totalAll = useMemo(() => Object.values(statusCounts).reduce((a, b) => a + b, 0), [statusCounts]);

  // ── Form ──
  const form = useForm<JadwalFormData>({
    resolver: zodResolver(jadwalSchema),
    defaultValues: { kegiatan: "", tanggal: todayStr(), jam: "08:00" },
  });

  const openCreate = () => { setEditItem(null); form.reset({ kegiatan: "", tanggal: todayStr(), jam: "08:00" }); setModalOpen(true); };
  const openEdit = (item: JadwalItem) => { setEditItem(item); form.reset({ kegiatan: item.kegiatan, tanggal: item.tanggal, jam: item.jam.slice(0, 5) }); setModalOpen(true); };

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createJadwal,
    onSuccess: () => { toast.success("Jadwal berhasil ditambah 🎉"); queryClient.invalidateQueries({ queryKey: ["jadwal"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JadwalItem> }) => updateJadwal(id, data),
    onSuccess: () => { toast.success("Jadwal berhasil diperbarui ✨"); queryClient.invalidateQueries({ queryKey: ["jadwal"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: JadwalItem["status"] }) => updateJadwal(id, { status }),
    onSuccess: () => { toast.success("Status berhasil diubah ✅"); queryClient.invalidateQueries({ queryKey: ["jadwal"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteJadwal,
    onSuccess: () => { toast.success("Jadwal berhasil dihapus 🗑️"); queryClient.invalidateQueries({ queryKey: ["jadwal"] }); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = form.handleSubmit((formData) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: formData });
    else createMutation.mutate(formData);
  });

  // ── Navigation ──
  const goToStatus = (status: string) => { setSelectedStatus(status); setLevel("table"); };
  const goToStatusLevel = () => { setSelectedStatus(null); setLevel("status"); };

  // ── Table Columns ──
  const columns = [
    { key: "status-icon", label: "", render: (v: string) => <span className="text-lg">{STATUS_ICON[v] || "⏰"}</span> },
    { key: "kegiatan", label: "Kegiatan", render: (v: string) => <span className="font-medium">{v}</span> },
    { key: "tanggal", label: "Tanggal" },
    { key: "jam", label: "Jam", render: (v: string) => v?.slice(0, 5) },
    { key: "status", label: "Status", render: (v: string) => <Badge variant={STATUS_BADGE[v] || "default"} className="capitalize">{v || "pending"}</Badge> },
    {
      key: "actions", label: "Aksi",
      render: (_: unknown, row: JadwalItem) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={() => updateStatusMutation.mutate({ id: row.id, status: "selesai" })} title="Selesai">✅</Button>
          <Button variant="ghost" size="icon-xs" onClick={() => updateStatusMutation.mutate({ id: row.id, status: "batal" })} title="Batal">❌</Button>
          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(row)} title="Edit/Tunda">⏳</Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(row)} title="Hapus">🗑️</Button>
        </div>
      ),
    },
  ];

  // ── Breadcrumb ──
  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap mb-1">
      <button onClick={goToStatusLevel} className="hover:text-foreground transition-colors">📅 Jadwal</button>
      {selectedStatus && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <span className="text-foreground font-medium">{STATUS_META[selectedStatus]?.label || selectedStatus}</span>
        </>
      )}
    </div>
  );

  // ── AnimatePresence ──
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-5 sm:space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {level !== "status" && (
                <Button variant="ghost" size="sm" onClick={goToStatusLevel} className="gap-1 -ml-2 text-muted-foreground">
                  <ArrowLeft className="size-4" /> Kembali
                </Button>
              )}
              <Breadcrumb />
            </div>
            <Button onClick={openCreate} variant="outline" size="sm" className="gap-1 shrink-0">
              <Plus className="size-3.5" /> Tambah
            </Button>
          </div>

          {/* ── Quick Stats (Level 0 only) ── */}
          {level === "status" && statsData && statsData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <GlassCard size="sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span>📊 Total: <strong className="text-foreground">{totalAll}</strong> agenda</span>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <span key={key} className="flex items-center gap-1">
                      <span>{meta.icon}</span>
                      <strong className="text-foreground">{statusCounts[key] || 0}</strong>
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ═══════════ LEVEL 0: Status Selection ═══════════ */}
            {level === "status" && (
              <motion.div key="level-status" {...pageVariants} className="space-y-5 sm:space-y-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Per-status cards */}
                    {Object.entries(STATUS_META).map(([key, meta]) => {
                      const count = statusCounts[key] || 0;
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <GlassCard
                            onClick={() => count > 0 && goToStatus(key)}
                            className={cn(
                              "cursor-pointer border",
                              STATUS_GRADIENTS[key] || "",
                              count === 0 ? "opacity-50 pointer-events-none" : HOVER_GLOW
                            )}
                          >
                            <div className="flex flex-col items-center text-center gap-1 py-1">
                              <span className="text-2xl">{meta.icon}</span>
                              <p className="font-semibold text-foreground text-sm">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{count} agenda</p>
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}

                    {/* Semua card */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
                    >
                      <GlassCard
                        onClick={() => goToStatus("")}
                        className={cn("cursor-pointer border border-border/50", HOVER_GLOW)}
                      >
                        <div className="flex flex-col items-center text-center gap-1 py-1">
                          <span className="text-2xl">📋</span>
                          <p className="font-semibold text-foreground text-sm">Semua</p>
                          <p className="text-xs text-muted-foreground">{totalAll} agenda</p>
                        </div>
                      </GlassCard>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ LEVEL 1: Table View ═══════════ */}
            {level === "table" && (
              <motion.div key="level-table" {...pageVariants} className="space-y-4">
                {/* Status filter pills */}
                <div className="flex md:flex-wrap gap-2 overflow-x-auto md:overflow-visible snap-x snap-mandatory [&::-webkit-scrollbar]:hidden -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                  {["", ...Object.keys(STATUS_META)].map((s) => (
                    <Button
                      key={s}
                      variant={(selectedStatus || "") === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStatus(s || null)}
                      className="snap-start shrink-0 gap-1"
                    >
                      {s ? STATUS_META[s]?.icon : "📋"} {s || "Semua"}
                    </Button>
                  ))}
                </div>

                {/* Table */}
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                  </div>
                ) : allJadwal.length > 0 ? (
                  <DataTable columns={columns} data={allJadwal} />
                ) : (
                  <EmptyState
                    icon="📭"
                    title={selectedStatus ? `Tidak ada agenda ${STATUS_META[selectedStatus]?.label.toLowerCase()}` : "Belum ada jadwal"}
                    description="Buat jadwal baru untuk mulai mengatur agenda"
                    action={<Button onClick={openCreate} variant="outline" size="sm"><Plus className="size-3.5 mr-1" /> Tambah Jadwal</Button>}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Modal ── */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Edit/Tunda Jadwal" : "Tambah Jadwal"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Kegiatan</label>
              <Input {...form.register("kegiatan")} placeholder="Nama kegiatan" />
              {form.formState.errors.kegiatan && <p className="text-xs text-destructive mt-1">{form.formState.errors.kegiatan.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tanggal</label>
              <Input type="date" {...form.register("tanggal")} />
              {form.formState.errors.tanggal && <p className="text-xs text-destructive mt-1">{form.formState.errors.tanggal.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Jam</label>
              <Input type="time" {...form.register("jam")} />
              {form.formState.errors.jam && <p className="text-xs text-destructive mt-1">{form.formState.errors.jam.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Simpan" : "Tambah"}
            </Button>
          </form>
        </Modal>

        {/* ── AlertDialog ── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle>
              <AlertDialogDescription>Yakin mau hapus "{deleteTarget?.kegiatan}"? Aksi ini tidak bisa dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </AuthGuard>
  );
}
```

---

### `dashboard/src/pages\dashboard\kategori.tsx`

```tsx
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/layout/AuthGuard";
import Layout from "@/components/layout/Layout";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getKategori, createKategori, updateKategori, deleteKategori, getTransaksi } from "@/lib/api";
import { cn, formatRupiah, formatDateTime } from "@/lib/utils";
import { kategoriSchema, type KategoriFormData } from "@/lib/schemas";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Inbox,
} from "lucide-react";
import type { KategoriItem, TransaksiItem } from "@/lib/types";

// ── Constants ──
const TIPE_META = {
  tabungan: { icon: PiggyBank, label: "Tabungan", color: "text-amber-500", bg: "bg-amber-500/10", iconEl: <PiggyBank className="size-5 text-amber-500" /> },
  pengeluaran: { icon: ArrowDownCircle, label: "Pengeluaran", color: "text-rose-500", bg: "bg-rose-500/10", iconEl: <ArrowDownCircle className="size-5 text-rose-500" /> },
  pemasukan: { icon: ArrowUpCircle, label: "Pemasukan", color: "text-emerald-500", bg: "bg-emerald-500/10", iconEl: <ArrowUpCircle className="size-5 text-emerald-500" /> },
} as const;

const GRADIENTS: Record<string, string> = {
  tabungan: "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20",
  pengeluaran: "bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20",
  pemasukan: "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
};

const HOVER_GLOW = "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-200";
const PULSE_ICON = { scale: [1, 1.08, 1] };

type PageLevel = "type" | "list" | "detail";
const TRANS_LIMIT = 10;

export default function KategoriPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // ── State: Navigation ──
  const [level, setLevel] = useState<PageLevel>("type");

  // Baca query param ?type= untuk direct drill-down dari sidebar
  useEffect(() => {
    const typeParam = router.query.type as string;
    if (typeParam && ["tabungan", "pengeluaran", "pemasukan"].includes(typeParam)) {
      setSelectedType(typeParam);
      setLevel("list");
    }
  }, [router.query.type]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KategoriItem | null>(null);
  const [trxPage, setTrxPage] = useState(1);
  const [search, setSearch] = useState("");

  // ── State: CRUD ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<KategoriItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KategoriItem | null>(null);

  // ── Queries ──
  const { data: kategoriList = [], isLoading } = useQuery({
    queryKey: ["kategori"],
    queryFn: getKategori,
  });

  // Stats per kategori (jumlah transaksi + terakhir)
  const { data: categoryStats } = useQuery({
    queryKey: ["kategori-trx-stats", kategoriList.length],
    queryFn: async () => {
      const results = await Promise.all(
        kategoriList.map(async (k: KategoriItem) => {
          const res = await getTransaksi({ kategori: k.nama_kategori, limit: 1 });
          return { nama: k.nama_kategori, total: res.total, lastTrx: res.data[0]?.created_at || null };
        })
      );
      const map: Record<string, { total: number; lastTrx: string | null }> = {};
      results.forEach((r) => { map[r.nama] = r; });
      return map;
    },
    enabled: kategoriList.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const { data: trxData, isLoading: trxLoading } = useQuery({
    queryKey: ["transaksi", selectedCategory?.nama_kategori, trxPage],
    queryFn: () => getTransaksi({ kategori: selectedCategory!.nama_kategori, page: trxPage, limit: TRANS_LIMIT }),
    enabled: level === "detail" && !!selectedCategory,
  });

  const transaksiList = trxData?.data || [];
  const totalTransaksi = trxData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalTransaksi / TRANS_LIMIT));

  // ── Derived Data ──
  const grouped = useMemo(() => {
    const acc: Record<string, KategoriItem[]> = {};
    kategoriList.forEach((k: KategoriItem) => {
      if (!acc[k.tipe]) acc[k.tipe] = [];
      acc[k.tipe].push(k);
    });
    return acc;
  }, [kategoriList]);

  const filteredList = selectedType ? (grouped[selectedType] || []) : [];

  // Search filter untuk Semua Kategori
  const filteredKategori = useMemo(() => {
    if (!search.trim()) return kategoriList;
    return kategoriList.filter((k: KategoriItem) =>
      k.nama_kategori.toLowerCase().includes(search.toLowerCase())
    );
  }, [kategoriList, search]);

  const tipeStats = useMemo(() => {
    const stats: Record<string, { count: number; totalSaldo: number }> = {};
    ["tabungan", "pengeluaran", "pemasukan"].forEach((t) => {
      const items = grouped[t] || [];
      stats[t] = {
        count: items.length,
        totalSaldo: items.reduce((sum, k) => sum + (k.saldo || 0), 0),
      };
    });
    return stats;
  }, [grouped]);

  const totalAllTransaksi = useMemo(() => {
    if (!categoryStats) return 0;
    return Object.values(categoryStats).reduce((sum, s) => sum + s.total, 0);
  }, [categoryStats]);

  // ── Form ──
  const form = useForm<KategoriFormData>({
    resolver: zodResolver(kategoriSchema),
    defaultValues: { nama_kategori: "", tipe: "pengeluaran" },
  });

  const openCreate = (prefillTipe?: string) => {
    setEditItem(null);
    form.reset({ nama_kategori: "", tipe: (prefillTipe as any) || "pengeluaran" });
    setModalOpen(true);
  };

  const openEdit = (item: KategoriItem) => {
    setEditItem(item);
    form.reset({ nama_kategori: item.nama_kategori, tipe: item.tipe });
    setModalOpen(true);
  };

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createKategori,
    onSuccess: () => { toast.success("Kategori berhasil ditambah 🎉"); queryClient.invalidateQueries({ queryKey: ["kategori"] }); queryClient.invalidateQueries({ queryKey: ["kategori-trx-stats"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<KategoriItem> }) => updateKategori(id, data),
    onSuccess: () => { toast.success("Kategori berhasil diperbarui ✨"); queryClient.invalidateQueries({ queryKey: ["kategori"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteKategori,
    onSuccess: () => { toast.success("Kategori berhasil dihapus 🗑️"); queryClient.invalidateQueries({ queryKey: ["kategori"] }); queryClient.invalidateQueries({ queryKey: ["kategori-trx-stats"] }); setDeleteTarget(null); setSelectedCategory(null); setLevel("list"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = form.handleSubmit((formData) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: formData });
    else createMutation.mutate(formData);
  });

  // ── Navigation ──
  const goToType = (tipe: string) => { setSelectedType(tipe); setSelectedCategory(null); setTrxPage(1); setLevel("list"); };
  const goToList = () => { setSelectedCategory(null); setTrxPage(1); setLevel("list"); };
  const goToTypeLevel = () => { setSelectedType(null); setSelectedCategory(null); setTrxPage(1); setLevel("type"); };
  const goToDetail = (kategori: KategoriItem) => { setSelectedCategory(kategori); setTrxPage(1); setLevel("detail"); };

  // ── Breadcrumb ──
  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap mb-1">
      <button onClick={goToTypeLevel} className="hover:text-foreground transition-colors">📂 Kategori</button>
      {selectedType && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <button onClick={goToList} className={cn("hover:text-foreground transition-colors", level === "list" && "text-foreground font-medium")}>
            {TIPE_META[selectedType as keyof typeof TIPE_META]?.label || selectedType}
          </button>
        </>
      )}
      {selectedCategory && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[120px]">{selectedCategory.nama_kategori}</span>
        </>
      )}
    </div>
  );

  // ── AnimatePresence ──
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-5 sm:space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {level !== "type" && (
                <Button variant="ghost" size="sm" onClick={level === "detail" ? goToList : goToTypeLevel} className="gap-1 -ml-2 text-muted-foreground">
                  <ArrowLeft className="size-4" /> Kembali
                </Button>
              )}
              <Breadcrumb />
            </div>
            <Button onClick={() => openCreate(selectedType || undefined)} variant="outline" size="sm" className="gap-1 shrink-0">
              <Plus className="size-3.5" /> Tambah
            </Button>
          </div>

          {/* ── Quick Stats Bar (Level 0 only) ── */}
          {level === "type" && !isLoading && kategoriList.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <GlassCard size="sm">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span>📊</span>
                    Total <strong className="text-foreground">{kategoriList.length}</strong> kategori
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/30">|</span>
                  <span className="flex items-center gap-1.5">
                    🐷 Tabungan <strong className="text-amber-600 dark:text-amber-400">{formatRupiah(tipeStats.tabungan.totalSaldo)}</strong>
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/30">|</span>
                  <span className="flex items-center gap-1.5">
                    📋 <strong className="text-foreground">{totalAllTransaksi}</strong> transaksi
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Level Content ── */}
          <AnimatePresence mode="wait">
            {/* ═══════════ LEVEL 0: Type Selection ═══════════ */}
            {level === "type" && (
              <motion.div key="level-type" {...pageVariants} className="space-y-5 sm:space-y-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(TIPE_META).map(([tipe, meta]) => {
                      const stats = tipeStats[tipe] || { count: 0, totalSaldo: 0 };
                      return (
                        <motion.div
                          key={tipe}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <GlassCard
                            onClick={() => goToType(tipe)}
                            className={cn("cursor-pointer border", GRADIENTS[tipe], HOVER_GLOW)}
                          >
                            <div className="flex items-start gap-4">
                              <div className={cn("flex size-12 items-center justify-center rounded-xl shrink-0", meta.bg)}>
                                {meta.iconEl}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground">{meta.label}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{stats.count} kategori</p>
                                {tipe === "tabungan" && stats.totalSaldo > 0 && (
                                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1.5">💰 {formatRupiah(stats.totalSaldo)}</p>
                                )}
                                {stats.count === 0 && <p className="text-xs text-muted-foreground/50 mt-1">Belum ada kategori</p>}
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground mt-1 shrink-0" />
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ── Search + Semua Kategori ── */}
                {!isLoading && kategoriList.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">📋 Semua Kategori</h3>
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Cari kategori..."
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>

                    {filteredKategori.length === 0 ? (
                      <motion.div animate={PULSE_ICON} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                        <EmptyState icon="🔍" title="Kategori tidak ditemukan" description={`Tidak ada hasil untuk "${search}"`} />
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredKategori.map((k: KategoriItem) => {
                          const stats = categoryStats?.[k.nama_kategori];
                          return (
                            <GlassCard
                              key={k.id}
                              onClick={() => goToType(k.tipe)}
                              className={cn("cursor-pointer", HOVER_GLOW)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", TIPE_META[k.tipe as keyof typeof TIPE_META]?.bg || "")}>
                                  {TIPE_META[k.tipe as keyof typeof TIPE_META]?.iconEl || <Inbox className="size-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{k.nama_kategori}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {k.tipe}
                                    {stats && ` • ${stats.total} transaksi`}
                                  </p>
                                </div>
                                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                              </div>
                            </GlassCard>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══════════ LEVEL 1: Category List ═══════════ */}
            {level === "list" && selectedType && (
              <motion.div key={`level-list-${selectedType}`} {...pageVariants} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {TIPE_META[selectedType as keyof typeof TIPE_META]?.iconEl}
                  <span className="font-medium text-foreground">{TIPE_META[selectedType as keyof typeof TIPE_META]?.label}</span>
                  <span>• {filteredList.length} kategori</span>
                </div>

                {filteredList.length === 0 ? (
                  <motion.div animate={PULSE_ICON} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                    <EmptyState
                      icon="📭"
                      title={`Belum ada kategori ${TIPE_META[selectedType as keyof typeof TIPE_META]?.label.toLowerCase()}`}
                      description={`Buat kategori ${TIPE_META[selectedType as keyof typeof TIPE_META]?.label.toLowerCase()} pertama`}
                      action={<Button onClick={() => openCreate(selectedType)} variant="outline" size="sm"><Plus className="size-3.5 mr-1" /> Buat {TIPE_META[selectedType as keyof typeof TIPE_META]?.label}</Button>}
                    />
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredList.map((k: KategoriItem, idx: number) => {
                      const stats = categoryStats?.[k.nama_kategori];
                      return (
                        <motion.div
                          key={k.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                        >
                          <GlassCard
                            onClick={() => goToDetail(k)}
                            className={cn("cursor-pointer border border-transparent", HOVER_GLOW)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("flex size-10 items-center justify-center rounded-xl shrink-0", TIPE_META[selectedType as keyof typeof TIPE_META]?.bg)}>
                                {TIPE_META[selectedType as keyof typeof TIPE_META]?.iconEl}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{k.nama_kategori}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {k.tipe === "tabungan" && (
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                      💰 {formatRupiah(k.saldo || 0)}
                                    </span>
                                  )}
                                  {stats && (
                                    <span className="text-xs text-muted-foreground">
                                      • {stats.total} transaksi
                                      {stats.lastTrx && ` • ${formatDateTime(stats.lastTrx)}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground mt-2 shrink-0" />
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ LEVEL 2: Transaction Detail ═══════════ */}
            {level === "detail" && selectedCategory && (
              <motion.div key={`level-detail-${selectedCategory.id}`} {...pageVariants} className="space-y-4">
                {/* Header info */}
                <GlassCard className={cn("border", GRADIENTS[selectedCategory.tipe] || "")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex size-12 items-center justify-center rounded-xl shrink-0", TIPE_META[selectedCategory.tipe as keyof typeof TIPE_META]?.bg)}>
                      {TIPE_META[selectedCategory.tipe as keyof typeof TIPE_META]?.iconEl}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">{selectedCategory.nama_kategori}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{selectedCategory.tipe}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {selectedCategory.tipe === "tabungan" ? (
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatRupiah(selectedCategory.saldo || 0)}</p>
                      ) : null}
                    </div>
                  </div>
                </GlassCard>

                {/* Transaction history */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span>📋</span> Riwayat Transaksi
                    {totalTransaksi > 0 && <span className="text-xs font-normal text-muted-foreground">({totalTransaksi})</span>}
                  </h4>

                  {trxLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : transaksiList.length === 0 ? (
                    <motion.div animate={PULSE_ICON} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                      <EmptyState icon="📭" title="Belum ada transaksi" description={`Transaksi untuk "${selectedCategory.nama_kategori}" akan muncul di sini`} />
                    </motion.div>
                  ) : (
                    <>
                      <div className="divide-y divide-border rounded-xl border overflow-hidden">
                        {transaksiList.map((trx: TransaksiItem) => {
                          const isPenarikan = (trx.keterangan || "").toLowerCase().includes("penarikan") || (trx.keterangan || "").toLowerCase().includes("tarik");
                          const jenis = isPenarikan ? "keluar" : "masuk";
                          return (
                            <div key={trx.id} className="flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-muted/30 transition-colors">
                              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", jenis === "masuk" ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                                {jenis === "masuk" ? (
                                  <ArrowDownRight className="size-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <ArrowUpRight className="size-4 text-rose-600 dark:text-rose-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{trx.keterangan || trx.kategori}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(trx.created_at)}</p>
                              </div>
                              <span className={cn("text-sm font-semibold shrink-0", jenis === "masuk" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                {jenis === "masuk" ? "+" : "−"}{formatRupiah(trx.nominal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <Button variant="outline" size="sm" onClick={() => setTrxPage((p) => Math.max(1, p - 1))} disabled={trxPage <= 1} className="gap-1">
                            <ChevronLeft className="size-3.5" /> Sebelumnya
                          </Button>
                          <span className="text-sm text-muted-foreground">{trxPage} dari {totalPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setTrxPage((p) => Math.min(totalPages, p + 1))} disabled={trxPage >= totalPages} className="gap-1">
                            Selanjutnya <ChevronRight className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(selectedCategory)}>
                    <Edit className="size-3.5" /> Edit Kategori
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 dark:border-red-900" onClick={() => setDeleteTarget(selectedCategory)}>
                    <Trash2 className="size-3.5" /> Hapus
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Modal CRUD ── */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Edit Kategori" : "Tambah Kategori"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nama Kategori</label>
              <Input {...form.register("nama_kategori")} placeholder="Nama kategori" autoFocus />
              {form.formState.errors.nama_kategori && <p className="text-xs text-destructive mt-1">{form.formState.errors.nama_kategori.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tipe</label>
              <Select value={form.watch("tipe")} onValueChange={(v) => form.setValue("tipe", v as "pemasukan" | "pengeluaran" | "tabungan")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="tabungan">Tabungan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Simpan" : "Tambah"}
            </Button>
          </form>
        </Modal>

        {/* ── AlertDialog ── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin mau hapus "<strong>{deleteTarget?.nama_kategori}</strong>"?
                {deleteTarget?.tipe !== "tabungan" && " Kategori dengan transaksi terkait tidak bisa dihapus."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </AuthGuard>
  );
}
```

---

### `dashboard/src/pages\dashboard\pengaturan.tsx`

```tsx
import { useState, useEffect } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Layout from "@/components/layout/Layout";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { changePassword, getDompet, updateDompet } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { changePasswordSchema, wishlistSchema } from "@/lib/schemas";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sun, Moon, Save } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function PengaturanPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: dompet } = useQuery({ queryKey: ["dompet"], queryFn: getDompet });

  const wishlistForm = useForm({
    resolver: zodResolver(wishlistSchema),
    values: { target_wishlist: dompet?.target_wishlist || "", nominal_wishlist: dompet?.nominal_wishlist || 0 },
  });

  const wishlistMutation = useMutation({
    mutationFn: updateDompet,
    onSuccess: () => toast.success("Wishlist berhasil disimpan"),
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) => changePassword(data.oldPassword, data.newPassword),
    onSuccess: () => { toast.success("Password berhasil diubah"); passwordForm.reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!mounted) return null;

  const wishlistProgress = dompet?.nominal_wishlist
    ? Math.min(100, Math.round(((dompet.saldo || 0) / dompet.nominal_wishlist) * 100)) : 0;

  return (
    <AuthGuard>
      <Layout>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-2xl space-y-5 sm:space-y-6">
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold text-foreground">⚙️ Pengaturan</h2>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-base font-semibold text-foreground mb-4">🎨 Tampilan</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Mode Tampilan:</span>
                <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-2">
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme === "dark" ? "Dark" : "Light"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-base font-semibold text-foreground mb-4">🎯 Wishlist</h3>
              <form onSubmit={wishlistForm.handleSubmit((data) => wishlistMutation.mutate(data))} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Nama Target</label>
                  <Input {...wishlistForm.register("target_wishlist")} placeholder="Misal: Beli Laptop Baru" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Nominal Target (Rp)</label>
                  <Input type="number" {...wishlistForm.register("nominal_wishlist", { valueAsNumber: true })} placeholder="0" />
                </div>
                {dompet?.target_wishlist && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{formatRupiah(dompet.saldo || 0)} terkumpul</span>
                      <span className="text-muted-foreground">{formatRupiah(dompet.nominal_wishlist || 0)} target</span>
                    </div>
                    <Progress value={wishlistProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{wishlistProgress}% tercapai</p>
                  </div>
                )}
                <Button type="submit" className="w-full gap-2" disabled={wishlistMutation.isPending}>
                  <Save className="size-4" /> Simpan Wishlist
                </Button>
              </form>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-base font-semibold text-foreground mb-4">🔒 Ganti Password</h3>
              <form onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Password Lama</label>
                  <Input type="password" {...passwordForm.register("oldPassword")} required />
                  {passwordForm.formState.errors.oldPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.oldPassword.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Password Baru</label>
                  <Input type="password" {...passwordForm.register("newPassword")} required />
                  {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Konfirmasi Password Baru</label>
                  <Input type="password" {...passwordForm.register("confirmPassword")} required />
                  {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>Ubah Password</Button>
              </form>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-base font-semibold text-foreground mb-2">📋 Informasi</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Bot Version: 1.0.0</p>
                <p>Dashboard API: {process.env.NEXT_PUBLIC_API_URL}</p>
                <p>Status: Running ✅</p>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </Layout>
    </AuthGuard>
  );
}
```

---

### `dashboard/src/pages\dashboard\transaksi\index.tsx`

```tsx
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/layout/AuthGuard";
import Layout from "@/components/layout/Layout";
import DataTable from "@/components/ui/DataTable";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTransaksi, createTransaksi, updateTransaksi, deleteTransaksi, getKategori } from "@/lib/api";
import { formatRupiah, formatDateTime, getMonthRange } from "@/lib/utils";
import { transaksiSchema, type TransaksiFormData } from "@/lib/schemas";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Download, ChevronRight, ChevronLeft, ArrowLeft, Plus, PiggyBank, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { TransaksiItem, KategoriItem } from "@/lib/types";

// ── Constants ──
const LIMIT = 20;
const TIPE_META = {
  tabungan: { icon: PiggyBank, label: "Tabungan", color: "text-amber-500", bg: "bg-amber-500/10", iconEl: <PiggyBank className="size-5 text-amber-500" /> },
  pengeluaran: { icon: ArrowDownCircle, label: "Pengeluaran", color: "text-rose-500", bg: "bg-rose-500/10", iconEl: <ArrowDownCircle className="size-5 text-rose-500" /> },
  pemasukan: { icon: ArrowUpCircle, label: "Pemasukan", color: "text-emerald-500", bg: "bg-emerald-500/10", iconEl: <ArrowUpCircle className="size-5 text-emerald-500" /> },
} as const;

const GRADIENTS: Record<string, string> = {
  tabungan: "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20",
  pengeluaran: "bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20",
  pemasukan: "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
};

const HOVER_GLOW = "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-200";

// ── CSV Export ──
function exportToCsv(data: TransaksiItem[], filename: string) {
  if (data.length === 0) return;
  const headers = ["Tanggal", "Kategori", "Keterangan", "Nominal"];
  const rows = data.map((t) => [formatDateTime(t.created_at), t.kategori, t.keterangan || "", String(t.nominal)]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type TransLevel = "type" | "list" | "table";

export default function TransaksiPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // ── Navigation State ──
  const [level, setLevel] = useState<TransLevel>("type");

  // Baca query param ?type= untuk direct drill-down dari sidebar
  useEffect(() => {
    const typeParam = router.query.type as string;
    if (typeParam && ["tabungan", "pengeluaran", "pemasukan"].includes(typeParam)) {
      setSelectedType(typeParam);
      setLevel("list");
    }
  }, [router.query.type]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Filter State ──
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(() => getMonthRange());
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransaksiItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransaksiItem | null>(null);

  // ── Queries ──
  const { data: kategoriList = [] } = useQuery({
    queryKey: ["kategori"],
    queryFn: getKategori,
  });

  // Stats per kategori (total transaksi)
  const { data: categoryStats } = useQuery({
    queryKey: ["kategori-trx-stats"],
    queryFn: async () => {
      const results = await Promise.all(
        kategoriList.map(async (k: KategoriItem) => {
          const res = await getTransaksi({ kategori: k.nama_kategori, limit: 1 });
          return { nama: k.nama_kategori, total: res.total };
        })
      );
      const map: Record<string, number> = {};
      results.forEach((r) => { map[r.nama] = r.total; });
      return map;
    },
    enabled: kategoriList.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Stats per tipe
  const tipeTotals = useMemo(() => {
    const totals: Record<string, number> = { tabungan: 0, pengeluaran: 0, pemasukan: 0 };
    if (categoryStats) {
      kategoriList.forEach((k: KategoriItem) => {
        totals[k.tipe] = (totals[k.tipe] || 0) + (categoryStats[k.nama_kategori] || 0);
      });
    }
    return totals;
  }, [categoryStats, kategoriList]);

  // Filtered kategori list for Level 1
  const filteredKategori = useMemo(() => {
    if (!selectedType) return [];
    return kategoriList.filter((k: KategoriItem) => k.tipe === selectedType);
  }, [kategoriList, selectedType]);

  // Transaction query (Level "table" only)
  const queryParams = {
    page, limit: LIMIT,
    tipe: selectedType || undefined,
    kategori: selectedCategory || undefined,
    search: search || undefined,
    start_date: dateRange.start,
    end_date: dateRange.end,
  };

  const { data: queryData, isLoading: trxLoading } = useQuery({
    queryKey: ["transaksi", queryParams],
    queryFn: () => getTransaksi(queryParams),
    enabled: level === "table",
  });

  const data = queryData?.data || [];
  const total = queryData?.total || 0;
  const totalPages = queryData?.total_pages || 1;

  // ── Form ──
  const form = useForm<TransaksiFormData>({
    resolver: zodResolver(transaksiSchema),
    defaultValues: { kategori: "", keterangan: "", nominal: undefined },
  });

  const openCreate = () => { setEditItem(null); form.reset({ kategori: selectedCategory || "", keterangan: "", nominal: undefined }); setModalOpen(true); };
  const openEdit = (row: TransaksiItem) => { setEditItem(row); form.reset({ kategori: row.kategori, keterangan: row.keterangan || "", nominal: row.nominal }); setModalOpen(true); };

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createTransaksi,
    onSuccess: () => { toast.success("Transaksi berhasil ditambah 🎉"); queryClient.invalidateQueries({ queryKey: ["transaksi"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); queryClient.invalidateQueries({ queryKey: ["kategori-trx-stats"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TransaksiItem> }) => updateTransaksi(id, data),
    onSuccess: () => { toast.success("Transaksi berhasil diperbarui ✨"); queryClient.invalidateQueries({ queryKey: ["transaksi"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); setModalOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTransaksi,
    onSuccess: () => { toast.success("Transaksi berhasil dihapus 🗑️"); queryClient.invalidateQueries({ queryKey: ["transaksi"] }); queryClient.invalidateQueries({ queryKey: ["stats"] }); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = form.handleSubmit((formData) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: formData });
    else createMutation.mutate(formData);
  });

  // ── Navigation ──
  const goToType = (tipe: string) => { setSelectedType(tipe); setSelectedCategory(null); setPage(1); setLevel("list"); };
  const goToList = () => { setSelectedCategory(null); setPage(1); setLevel("list"); };
  const goToTypeLevel = () => { setSelectedType(null); setSelectedCategory(null); setPage(1); setLevel("type"); };
  const goToTable = (kategori?: string) => { setSelectedCategory(kategori || null); setPage(1); setLevel("table"); };
  const goToTableAll = () => { setLevel("table"); };

  // ── Table Columns ──
  const columns = [
    { key: "created_at", label: "Tanggal", render: (v: string) => formatDateTime(v) },
    { key: "kategori", label: "Kategori", render: (v: string) => <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{v}</span> },
    { key: "keterangan", label: "Keterangan" },
    { key: "nominal", label: "Nominal", render: (v: string) => <span className={parseInt(v) < 0 ? "text-destructive" : "text-green-500"}>{formatRupiah(v)}</span> },
    {
      key: "actions", label: "Aksi",
      render: (_: unknown, row: TransaksiItem) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(row)} title="Edit">✏️</Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(row)} title="Hapus">🗑️</Button>
        </div>
      ),
    },
  ];

  // ── Breadcrumb ──
  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap mb-1">
      <button onClick={goToTypeLevel} className="hover:text-foreground transition-colors">💸 Transaksi</button>
      {selectedType && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <button onClick={goToList} className={cn("hover:text-foreground transition-colors", level === "list" && "text-foreground font-medium")}>
            {TIPE_META[selectedType as keyof typeof TIPE_META]?.label || selectedType}
          </button>
        </>
      )}
      {selectedCategory && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[140px]">{selectedCategory}</span>
        </>
      )}
    </div>
  );

  // ── AnimatePresence ──
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-5 sm:space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {level !== "type" && (
                <Button variant="ghost" size="sm" onClick={level === "table" ? goToList : goToTypeLevel} className="gap-1 -ml-2 text-muted-foreground">
                  <ArrowLeft className="size-4" /> Kembali
                </Button>
              )}
              <Breadcrumb />
            </div>
            <div className="flex gap-2 shrink-0">
              {level === "table" && (
                <Button variant="outline" size="sm" onClick={() => exportToCsv(data, `transaksi_${dateRange.start}_${dateRange.end}`)} disabled={data.length === 0}>
                  <Download className="size-3.5 mr-1" /> CSV
                </Button>
              )}
              {(level === "table" || level === "type") && (
                <Button onClick={openCreate} variant="outline" size="sm"><Plus className="size-3.5 mr-1" /> Tambah</Button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ═══════════ LEVEL 0: Type Selection ═══════════ */}
            {level === "type" && (
              <motion.div key="level-type" {...pageVariants} className="space-y-5 sm:space-y-6">
                {kategoriList.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(TIPE_META).map(([tipe, meta]) => (
                      <GlassCard key={tipe} className="opacity-50">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex size-10 items-center justify-center rounded-xl", meta.bg)}>{meta.iconEl}</div>
                          <div><p className="font-medium text-foreground">{meta.label}</p><p className="text-xs text-muted-foreground">0 transaksi</p></div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(TIPE_META).map(([tipe, meta]) => {
                      const totalTrx = tipeTotals[tipe] || 0;
                      return (
                        <motion.div
                          key={tipe}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          <GlassCard onClick={() => goToType(tipe)} className={cn("cursor-pointer border", GRADIENTS[tipe], HOVER_GLOW)}>
                            <div className="flex items-center gap-3">
                              <div className={cn("flex size-10 items-center justify-center rounded-xl shrink-0", meta.bg)}>{meta.iconEl}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground">{meta.label}</p>
                                <p className="text-xs text-muted-foreground">{totalTrx} transaksi</p>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}

                    {/* Semua Transaksi */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
                    >
                      <GlassCard onClick={goToTableAll} className={cn("cursor-pointer border border-border/50", HOVER_GLOW)}>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                            <span className="text-lg">📋</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">Semua Transaksi</p>
                            <p className="text-xs text-muted-foreground">Tanpa filter kategori</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                        </div>
                      </GlassCard>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════ LEVEL 1: Category List ═══════════ */}
            {level === "list" && selectedType && (
              <motion.div key={`level-list-${selectedType}`} {...pageVariants} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {TIPE_META[selectedType as keyof typeof TIPE_META]?.iconEl}
                  <span className="font-medium text-foreground">{TIPE_META[selectedType as keyof typeof TIPE_META]?.label}</span>
                  <span>• {filteredKategori.length} kategori</span>
                </div>

                {filteredKategori.length === 0 ? (
                  <EmptyState icon="📭" title={`Belum ada kategori ${TIPE_META[selectedType as keyof typeof TIPE_META]?.label.toLowerCase()}`} description={`Buat kategori ${TIPE_META[selectedType as keyof typeof TIPE_META]?.label.toLowerCase()} untuk mulai mencatat transaksi`} />
                ) : (
                  <>
                    {/* Semua [tipe] card */}
                    <GlassCard onClick={() => goToTable()} className={cn("cursor-pointer border border-dashed border-border/60", HOVER_GLOW)}>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-10 items-center justify-center rounded-xl", TIPE_META[selectedType as keyof typeof TIPE_META]?.bg)}>
                          {TIPE_META[selectedType as keyof typeof TIPE_META]?.iconEl}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">Semua {TIPE_META[selectedType as keyof typeof TIPE_META]?.label}</p>
                          <p className="text-xs text-muted-foreground">{tipeTotals[selectedType] || 0} transaksi</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    </GlassCard>

                    {/* Per-kategori cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredKategori.map((k: KategoriItem, idx: number) => {
                        const totalTrx = categoryStats?.[k.nama_kategori] || 0;
                        return (
                          <motion.div
                            key={k.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                          >
                            <GlassCard onClick={() => goToTable(k.nama_kategori)} className={cn("cursor-pointer border border-transparent", HOVER_GLOW)}>
                              <div className="flex items-center gap-3">
                                <div className={cn("flex size-10 items-center justify-center rounded-xl shrink-0", TIPE_META[selectedType as keyof typeof TIPE_META]?.bg)}>
                                  {TIPE_META[selectedType as keyof typeof TIPE_META]?.iconEl}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground">{k.nama_kategori}</p>
                                  <p className="text-xs text-muted-foreground">{totalTrx} transaksi</p>
                                </div>
                                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                              </div>
                            </GlassCard>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ═══════════ LEVEL 2: Transaction Table ═══════════ */}
            {level === "table" && (
              <motion.div key="level-table" {...pageVariants} className="space-y-4">
                {/* Filters */}
                <div className="flex md:flex-wrap gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory [&::-webkit-scrollbar]:hidden -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                  <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 Cari keterangan..." className="max-w-xs shrink-0 snap-start" />
                  <div className="shrink-0 snap-start">
                    <DateRangePicker value={dateRange} onChange={(r) => { setDateRange(r); setPage(1); }} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCsv(data, `transaksi_${dateRange.start}_${dateRange.end}`)} className="gap-1.5 shrink-0 snap-start">
                    <Download className="size-4" /> Export CSV
                  </Button>
                </div>

                {/* Table */}
                {trxLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                  </div>
                ) : data.length > 0 ? (
                  <>
                    <DataTable columns={columns} data={data} />
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="gap-1">
                          <ChevronLeft className="size-3.5" /> Sebelumnya
                        </Button>
                        <span className="text-sm text-muted-foreground">{page} dari {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="gap-1">
                          Selanjutnya <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon="📭" title="Belum ada transaksi" description="Coba ubah filter atau tambah transaksi baru" action={<Button onClick={openCreate} variant="outline" size="sm"><Plus className="size-3.5 mr-1" /> Tambah Transaksi</Button>} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Modal ── */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Edit Transaksi" : "Tambah Transaksi"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Kategori</label>
              <Select value={form.watch("kategori")} onValueChange={(v) => form.setValue("kategori", v || "")}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>{(kategoriList || []).map((k: KategoriItem) => (<SelectItem key={k.id} value={k.nama_kategori}>{k.nama_kategori}</SelectItem>))}</SelectContent>
              </Select>
              {form.formState.errors.kategori && <p className="text-xs text-destructive mt-1">{form.formState.errors.kategori.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Keterangan</label>
              <Input {...form.register("keterangan")} placeholder="Opsional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nominal (Rp)</label>
              <Input type="number" {...form.register("nominal", { valueAsNumber: true })} placeholder="0" />
              {form.formState.errors.nominal && <p className="text-xs text-destructive mt-1">{form.formState.errors.nominal.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Simpan" : "Tambah"}
            </Button>
          </form>
        </Modal>

        {/* ── AlertDialog ── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
              <AlertDialogDescription>Aksi ini tidak bisa dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </AuthGuard>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
```

---

### `dashboard/src/lib\api.ts`

```ts
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
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k

---

### `dashboard/src/lib/auth.ts`

```ts
const TOKEN_KEY = 'assistent_token';

export function login(password: string): Promise<boolean> {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  }).then(async (res) => {
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return true;
  });
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

```

---

### `dashboard/src/lib/schemas.ts`

```ts
import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().min(1, "Password wajib diisi"),
});

export const transaksiSchema = z.object({
  kategori: z.string().min(1, "Kategori wajib dipilih"),
  keterangan: z.string().optional(),
  nominal: z.number({ message: "Nominal harus angka" })
    .positive("Nominal harus lebih dari 0"),
});

export const kategoriSchema = z.object({
  nama_kategori: z.string().min(1, "Nama kategori wajib diisi"),
  tipe: z.enum(["pemasukan", "pengeluaran", "tabungan"]),
});

export const jadwalSchema = z.object({
  kegiatan: z.string().min(1, "Kegiatan wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  jam: z.string().min(1, "Jam wajib diisi"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(4, "Password baru minimal 4 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

export const wishlistSchema = z.object({
  target_wishlist: z.string().optional(),
  nominal_wishlist: z.number().min(0).optional(),
});

export type TransaksiFormData = z.infer<typeof transaksiSchema>;
export type KategoriFormData = z.infer<typeof kategoriSchema>;
export type JadwalFormData = z.infer<typeof jadwalSchema>;

```

---

### `dashboard/src/lib/types.ts`

```ts
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

```

---

### `dashboard/src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatRupiahSingkat(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'rb';
  return num.toString();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/,/g, '');
}

export function getGreeting(): string {
  const jam = new Date().getHours();
  if (jam < 12) return 'pagi';
  if (jam < 15) return 'siang';
  if (jam < 18) return 'sore';
  return 'malam';
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

```

---

### `dashboard/src/components/layout/AuthGuard.tsx`

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isAuthenticated } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border p-8 text-center space-y-4">
          <Skeleton className="h-8 w-8 rounded-full mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <p className="text-sm text-muted-foreground">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

```

---

### `dashboard/src/components/layout/Layout.tsx`

```tsx
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import AppSidebar from "./Sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { Sun, Moon, LayoutDashboard, ArrowLeftRight, FolderKanban, CalendarDays, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, { label: string; icon: React.ReactNode }> = {
  "/dashboard": { label: "Beranda", icon: <LayoutDashboard className="size-4" /> },
  "/dashboard/transaksi": { label: "Transaksi", icon: <ArrowLeftRight className="size-4" /> },
  "/dashboard/kategori": { label: "Kategori", icon: <FolderKanban className="size-4" /> },
  "/dashboard/jadwal": { label: "Jadwal", icon: <CalendarDays className="size-4" /> },
  "/dashboard/pengaturan": { label: "Pengaturan", icon: <Settings className="size-4" /> },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentPage = useMemo(() => {
    // Find the best matching route
    const exact = pageTitles[router.pathname];
    if (exact) return exact;
    // Fallback: show last segment
    const segment = router.pathname.split("/").pop() || "Dashboard";
    return { label: segment.charAt(0).toUpperCase() + segment.slice(1), icon: null };
  }, [router.pathname]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <Header pageIcon={currentPage.icon} pageLabel={currentPage.label} />
        <div className="flex-1 p-4 lg:p-6 pt-0">
          <AnimatePresence mode="wait">
            <div key={router.pathname}>{children}</div>
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Header({ pageIcon, pageLabel }: { pageIcon: React.ReactNode; pageLabel: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <header className="flex items-center gap-2 px-4 lg:px-6 py-3 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground flex-1">
        {pageIcon}
        <h2>{pageLabel}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}

```

---

### `dashboard/src/components/layout/Sidebar.tsx`

```tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { getJadwal } from "@/lib/api";
import { todayStr } from "@/lib/utils";
import { logout } from "@/lib/auth";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  CalendarDays,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  ChevronRight,
  PiggyBank,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const tipeSubItems = [
  { label: "Tabungan", icon: PiggyBank, color: "text-amber-500", query: "tabungan" },
  { label: "Pengeluaran", icon: ArrowDownCircle, color: "text-rose-500", query: "pengeluaran" },
  { label: "Pemasukan", icon: ArrowUpCircle, color: "text-emerald-500", query: "pemasukan" },
];

export default function AppSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return router.pathname === "/dashboard";
    return router.pathname.startsWith(href);
  };

  const isSubActive = (href: string, query?: string) => {
    if (query) return router.pathname === href && router.query.type === query;
    return router.pathname === href;
  };

  // Badge: agenda pending hari ini
  const { data: jadwalHariIni } = useQuery({
    queryKey: ["jadwal", "hari-ini"],
    queryFn: () => getJadwal({ tanggal: todayStr(), status: "pending" }),
    enabled: mounted,
  });
  const agendaCount = jadwalHariIni?.length || 0;

  if (!mounted) return null;

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* ── Header: Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold animate-logo-float">
                K
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Kyy Assistant</span>
                <span className="text-xs text-muted-foreground">Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent>
        {/* Utama */}
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive={isActive("/dashboard") && !router.query.type}
                  tooltip="Beranda"
                  className="sidebar-item"
                >
                  <LayoutDashboard className="size-4 text-indigo-500" />
                  <span>Beranda</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Keuangan */}
        <SidebarGroup>
          <SidebarGroupLabel>Keuangan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Kategori */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/kategori" />}
                  isActive={isActive("/dashboard/kategori") && !router.query.type}
                  tooltip="Kategori"
                  className="sidebar-item"
                >
                  <FolderKanban className="size-4 text-blue-500" />
                  <span>Kategori</span>
                  {state === "collapsed" && <ChevronRight className="size-3 ml-auto text-muted-foreground" />}
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {tipeSubItems.map((item) => (
                    <SidebarMenuSubItem key={item.query}>
                      <SidebarMenuSubButton
                        render={<Link href={`/dashboard/kategori?type=${item.query}`} />}
                        isActive={isSubActive("/dashboard/kategori", item.query)}
                        className={cn(isSubActive("/dashboard/kategori", item.query) && sidebarSubItemActive)}
                      >
                        <item.icon className={cn("size-3.5", item.color)} />
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>

              {/* Transaksi */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/transaksi" />}
                  isActive={isActive("/dashboard/transaksi") && !router.query.type}
                  tooltip="Transaksi"
                  className="sidebar-item"
                >
                  <ArrowLeftRight className="size-4 text-emerald-500" />
                  <span>Transaksi</span>
                  {state === "collapsed" && <ChevronRight className="size-3 ml-auto text-muted-foreground" />}
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {tipeSubItems.map((item) => (
                    <SidebarMenuSubItem key={item.query}>
                      <SidebarMenuSubButton
                        render={<Link href={`/dashboard/transaksi?type=${item.query}`} />}
                        isActive={isSubActive("/dashboard/transaksi", item.query)}
                        className={cn(isSubActive("/dashboard/transaksi", item.query) && sidebarSubItemActive)}
                      >
                        <item.icon className={cn("size-3.5", item.color)} />
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<Link href="/dashboard/transaksi" />}
                      isActive={isActive("/dashboard/transaksi") && !router.query.type}
                    >
                      <span className="text-xs">📋</span>
                      <span>Semua</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Produktivitas */}
        <SidebarGroup>
          <SidebarGroupLabel>Produktivitas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/jadwal" />}
                  isActive={isActive("/dashboard/jadwal")}
                  tooltip="Jadwal"
                  className="sidebar-item"
                >
                  <CalendarDays className="size-4 text-amber-500" />
                  <span>Jadwal</span>
                  {agendaCount > 0 && (
                    <SidebarMenuBadge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {agendaCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lainnya */}
        <SidebarGroup>
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/pengaturan" />}
                  isActive={isActive("/dashboard/pengaturan")}
                  tooltip="Pengaturan"
                  className="sidebar-item"
                >
                  <Settings className="size-4 text-gray-500" />
                  <span>Pengaturan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton tooltip="Tuan Zidane" size="lg" className="group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2!" />
                }
              >
                <div className="flex aspect-square size-7 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shrink-0">
                  Z
                </div>
                <div className="flex flex-col gap-0.5 leading-none text-left flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="font-medium truncate">Tuan Zidane</span>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
                <ChevronDown className="size-3.5 ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/dashboard/pengaturan")}>
                  <Settings className="size-4 mr-2" /> Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
                  {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
                  <LogOut className="size-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          {/* Quick action */}
          {state === "expanded" && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard/transaksi" />}
                className="mt-1 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              >
                <Plus className="size-4" />
                <span>Transaksi Cepat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

const sidebarSubItemActive =
  "bg-accent text-accent-foreground font-medium border-l-2 border-primary";

```

---

### `dashboard/src/components/ui/GlassCard.tsx`

```tsx
import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  size?: "default" | "sm";
}

export default function GlassCard({ children, className = "", onClick, size }: GlassCardProps) {
  return (
    <Card
      size={size}
      onClick={onClick}
      className={cn(
        "glass border-0 shadow-none",
        onClick && "cursor-pointer glass-hover",
        className
      )}
    >
      {children}
    </Card>
  );
}

```

---

### `dashboard/src/components/ui/StatCard.tsx`

```tsx
"use client";

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Sparkline from "@/components/ui/Sparkline";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  subtext?: string;
  color?: string;
  trend?: number[];
  trendColor?: string;
  delay?: number;
  isZero?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  format = (n) => String(n),
  subtext,
  color = "from-indigo-500 to-purple-600",
  trend,
  trendColor,
  delay = 0,
  isZero,
}: StatCardProps) {
  const showZero = isZero ?? (value === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className="glass border-0 shadow-none group hover:-translate-y-0.5 transition-transform duration-200">
        <CardContent className="flex flex-col gap-2 px-(--card-spacing) py-(--card-spacing)">
          {/* Header: icon + label */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="size-3.5 text-primary" />
          </div>
          </div>

          {/* Value */}
          <div className="min-h-[2rem]">
            {showZero ? (
              <p className="text-2xl font-bold text-muted-foreground/40">—</p>
            ) : (
              <AnimatedCounter
                value={value}
                format={format}
                className={cn(
                  "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  color
                )}
                delay={delay + 200}
              />
            )}
          </div>

          {/* Sparkline + Subtext */}
          <div className="flex items-end justify-between gap-2 min-h-[28px]">
            {trend && trend.length >= 2 && (
              <div className="flex-1 max-w-[80px] opacity-60">
                <Sparkline data={trend} color={trendColor || "#6366f1"} />
              </div>
            )}
            {subtext && (
              <span className="text-xs text-muted-foreground ml-auto">
                {subtext}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

```

---

### `dashboard/src/components/ui/EmptyState.tsx`

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

```

---

### `dashboard/src/components/ui/AnimatedCounter.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  delay?: number;
}

export default function AnimatedCounter({
  value,
  format,
  className,
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });

  const rounded = useTransform(springValue, (v) => Math.round(v));

  useEffect(() => {
    const timeout = setTimeout(() => {
      motionValue.set(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format ? format(latest) : String(latest);
      }
    });
    return unsubscribe;
  }, [rounded, format]);

  return <span ref={ref} className={className}>{format ? format(0) : "0"}</span>;
}

```

---

### `dashboard/src/components/ui/DataTable.tsx`

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  loading?: boolean;
}

export default function DataTable({ columns, data, onRowClick, loading }: DataTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {columns.map((col) => (
              <Skeleton key={col.key} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return null; // Biarkan caller handle empty state dengan EmptyState
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className="whitespace-nowrap">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer" : ""}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

```

---

### `dashboard/src/components/ui/Modal.tsx`

```tsx
import { type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md glass border-0 shadow-none">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

```

---

### `dashboard/src/components/ui/Sparkline.tsx`

```tsx
"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = "#6366f1", height = 28 }: SparklineProps) {
  if (!data || data.length < 2 || data.every(v => v === 0)) return null;

  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkline-${color.replace("#", "")})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

```

---

### `dashboard/src/components/ui/DateRangePicker.tsx`

```tsx
"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    value.start ? new Date(value.start + "T00:00:00") : undefined
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    value.end ? new Date(value.end + "T00:00:00") : undefined
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    const from = range.from;
    const to = range.to || range.from;
    setStartDate(from);
    setEndDate(to);
    if (from && to) {
      onChange({
        start: format(from, "yyyy-MM-dd"),
        end: format(to, "yyyy-MM-dd"),
      });
    }
  };

  const displayValue =
    startDate && endDate
      ? `${format(startDate, "dd MMM", { locale: id })} - ${format(endDate, "dd MMM", { locale: id })}`
      : value.start
        ? `${value.start} — ${value.end}`
        : "";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            data-empty={!displayValue}
            className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground gap-2 min-w-[180px]"
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0" />
        {displayValue || "Filter tanggal"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: startDate, to: endDate }}
          onSelect={handleSelect}
          locale={id}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

```

---

