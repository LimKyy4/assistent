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
