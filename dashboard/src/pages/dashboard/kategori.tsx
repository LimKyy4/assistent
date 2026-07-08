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
