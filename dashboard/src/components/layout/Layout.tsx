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
