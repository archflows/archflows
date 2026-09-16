"use client";

import { useEffect } from "react";

const ATTR = "data-lp-hydrated";

/** Marks landing hydration complete so ScrollReveal can touch the DOM safely. */
export function LandingRevealReady() {
  useEffect(() => {
    document.documentElement.setAttribute(ATTR, "");
    return () => document.documentElement.removeAttribute(ATTR);
  }, []);

  return null;
}
