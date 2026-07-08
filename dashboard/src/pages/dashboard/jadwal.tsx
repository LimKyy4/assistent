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
