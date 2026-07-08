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
