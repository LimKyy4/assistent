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
