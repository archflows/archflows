"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = [
  ".reveal-target",
  ".hero-copy",
  ".hero-visual",
  ".mini-stat",
  ".lp-rail",
  ".lp-card",
  ".lp-step",
  ".lp-proof-panel",
  ".box-grid > .box",
  ".cta-box",
  ".faq-item",
].join(",");

/**
 * Staggered entry animation, desktop only — mobile and reduced-motion opt out
 * so first paint stays cheap. Skipped on dashboard/auth.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const bare =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/login");

    const skip =
      bare ||
      window.matchMedia("(max-width: 900px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = document.documentElement;
    root.querySelectorAll(".reveal").forEach((el) => {
      el.classList.remove("reveal", "is-in");
      (el as HTMLElement).style.removeProperty("--ri");
    });

    if (skip) {
      root.classList.remove("reveal-on");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const frame = requestAnimationFrame(() => {
      const nodes = document.querySelectorAll<HTMLElement>(SELECTOR);
      nodes.forEach((el, i) => {
        el.classList.add("reveal");
        el.style.setProperty("--ri", String(i % 6));
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 40) {
          el.classList.add("is-in");
        } else {
          observer.observe(el);
        }
      });
      root.classList.add("reveal-on");
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.classList.remove("reveal-on");
    };
  }, [pathname]);

  return null;
}
