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

function clearReveal(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    el.removeAttribute("data-reveal");
    el.removeAttribute("data-reveal-in");
    el.style.removeProperty("--ri");
  });
  // Legacy cleanup from older class-based reveals
  root.querySelectorAll(".reveal").forEach((el) => {
    el.classList.remove("reveal", "is-in");
    (el as HTMLElement).style.removeProperty("--ri");
  });
}

/**
 * Staggered section reveals for marketing pages.
 * Uses data-* attrs (not className) and starts after hydration to avoid SSR mismatches.
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
      clearReveal(document);
      root.classList.remove("reveal-on", "reveal-mobile");
      return;
    }

    clearReveal(document);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-on", "reveal-mobile");
      return;
    }

    const mobile = window.matchMedia("(max-width: 900px)").matches;
    root.classList.toggle("reveal-mobile", mobile);

    let observer: IntersectionObserver | null = null;
    let cancelled = false;
    let timer = 0;
    let raf1 = 0;
    let raf2 = 0;

    const boot = () => {
      if (cancelled) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            (entry.target as HTMLElement).setAttribute("data-reveal-in", "");
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );

      const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      const groupIndex = new Map<Element, number>();

      nodes.forEach((el) => {
        const group = el.closest(GROUP_SEL) ?? root;
        const i = groupIndex.get(group) ?? 0;
        groupIndex.set(group, i + 1);

        el.setAttribute("data-reveal", "");
        el.style.setProperty("--ri", String(Math.min(i, 10)));

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 24) {
          el.setAttribute("data-reveal-in", "");
        } else {
          observer?.observe(el);
        }
      });

      root.classList.add("reveal-on");
    };

    // Defer past React hydration / streaming so DOM attrs aren't compared mid-hydrate.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        timer = window.setTimeout(boot, 0);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
      observer?.disconnect();
      clearReveal(document);
      root.classList.remove("reveal-on", "reveal-mobile");
    };
  }, [pathname]);

  return null;
}
