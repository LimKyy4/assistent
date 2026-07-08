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
