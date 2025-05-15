"use client";

import { motion } from "motion/react";

export function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <motion.div
        className="size-12 rounded-full border-4 border-t-4 border-zinc-800 border-t-white ease-linear"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, loop: Infinity, ease: "linear" }}
      />
    </div>
  );
}
