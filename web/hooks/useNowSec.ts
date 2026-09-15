"use client";

import { useEffect, useState } from "react";

export function useNowSec(intervalMs = 1000) {
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const tick = () => setNow(BigInt(Math.floor(Date.now() / 1000)));
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
