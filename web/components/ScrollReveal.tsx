"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Landing blocks that should enter one-by-one, Notion-style. */
const SELECTOR = [
  ".lp-hero .hero-copy > *",
  ".lp-marquee",
  ".lp .lp-head",
  ".lp-card",
  ".lp-flow-row",
  ".lp-proof-copy > *",
  ".lp-proof-panel",
  ".lp-pillar",
  ".lp-testimonials-head > *",
  ".lp-testimonials-rows",
  ".lp-faq-list .faq-item",
  ".lp-cta > *",
].join(",");

const GROUP_SEL = ".lp-hero, .lp-marquee, .lp-section, .lp-testimonials";

/**
 * Staggered section reveals for marketing pages.
 * Reduced-motion users get an instant paint. Mobile keeps a lighter rise.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const bare =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/login");

    const root = document.documentElement;

    if (bare) {
      root.classList.remove("reveal-on", "reveal-mobile");
      return;
    }

    root.querySelectorAll(".reveal").forEach((el) => {
      el.classList.remove("reveal", "is-in");
      (el as HTMLElement).style.removeProperty("--ri");
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-on", "reveal-mobile");
      return;
    }

    const mobile = window.matchMedia("(max-width: 900px)").matches;
    root.classList.toggle("reveal-mobile", mobile);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const frame = requestAnimationFrame(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      const groupIndex = new Map<Element, number>();

      nodes.forEach((el) => {
        const group = el.closest(GROUP_SEL) ?? root;
        const i = groupIndex.get(group) ?? 0;
        groupIndex.set(group, i + 1);

        el.classList.add("reveal");
        el.style.setProperty("--ri", String(Math.min(i, 10)));

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 24) {
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
      root.classList.remove("reveal-on", "reveal-mobile");
    };
  }, [pathname]);

  return null;
}
