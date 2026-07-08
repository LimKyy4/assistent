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
