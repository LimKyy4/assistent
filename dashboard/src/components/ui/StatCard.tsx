"use client";

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Sparkline from "@/components/ui/Sparkline";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  subtext?: string;
  color?: string;
  trend?: number[];
  trendColor?: string;
  delay?: number;
  isZero?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  format = (n) => String(n),
  subtext,
  color = "from-indigo-500 to-purple-600",
  trend,
  trendColor,
  delay = 0,
  isZero,
}: StatCardProps) {
  const showZero = isZero ?? (value === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className="glass border-0 shadow-none group hover:-translate-y-0.5 transition-transform duration-200">
        <CardContent className="flex flex-col gap-2 px-(--card-spacing) py-(--card-spacing)">
          {/* Header: icon + label */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="size-3.5 text-primary" />
          </div>
          </div>

          {/* Value */}
          <div className="min-h-[2rem]">
            {showZero ? (
              <p className="text-2xl font-bold text-muted-foreground/40">—</p>
            ) : (
              <AnimatedCounter
                value={value}
                format={format}
                className={cn(
                  "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  color
                )}
                delay={delay + 200}
              />
            )}
          </div>

          {/* Sparkline + Subtext */}
          <div className="flex items-end justify-between gap-2 min-h-[28px]">
            {trend && trend.length >= 2 && (
              <div className="flex-1 max-w-[80px] opacity-60">
                <Sparkline data={trend} color={trendColor || "#6366f1"} />
              </div>
            )}
            {subtext && (
              <span className="text-xs text-muted-foreground ml-auto">
                {subtext}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
