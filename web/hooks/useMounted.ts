"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client HTML mismatch for wagmi / browser-wallet UI. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
