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
