'use client';

import { motion } from 'motion/react';

export function HistoryItemSkeleton() {
  return (
    <motion.div className="h-16 w-full animate-pulse rounded-lg bg-zinc-800/80" />
  );
}