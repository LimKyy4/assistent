"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  delay?: number;
}

export default function AnimatedCounter({
  value,
  format,
  className,
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });

  const rounded = useTransform(springValue, (v) => Math.round(v));

  useEffect(() => {
    const timeout = setTimeout(() => {
      motionValue.set(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format ? format(latest) : String(latest);
      }
    });
    return unsubscribe;
  }, [rounded, format]);

  return <span ref={ref} className={className}>{format ? format(0) : "0"}</span>;
}
