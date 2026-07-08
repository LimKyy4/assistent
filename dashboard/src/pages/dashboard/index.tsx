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
