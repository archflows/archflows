"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Hero dashboard shot with scroll-linked 3D tilt.
 * Scroll down → image leans back / drifts (ngoyor), like a product stage.
 */
export function HeroShot() {
  const frameRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const motion = motionRef.current;
    if (!frame || !motion) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      motion.style.transform = "";
      motion.style.opacity = "";
      return;
    }

    let raf = 0;
    let booted = false;

    const apply = () => {
      raf = 0;
      const rect = frame.getBoundingClientRect();
      const view = window.innerHeight || 1;
      // 0 at top of page, 1 when the shot has mostly scrolled away
      const raw = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.85 + view * 0.15)));
      const t = raw * raw * (3 - 2 * raw); // smoothstep

      const mobile = window.matchMedia("(max-width: 720px)").matches;
      const rotateX = t * (mobile ? 10 : 16);
      const rotateY = Math.sin(t * Math.PI) * (mobile ? 1.2 : 2.4);
      const rotateZ = t * (mobile ? -0.6 : -1.1);
      const scale = 1 - t * (mobile ? 0.04 : 0.07);
      const y = t * (mobile ? 28 : 56);
      const opacity = 1 - t * 0.28;

      motion.style.transform = [
        `translate3d(0, ${y.toFixed(2)}px, 0)`,
        `rotateX(${rotateX.toFixed(2)}deg)`,
        `rotateY(${rotateY.toFixed(2)}deg)`,
        `rotateZ(${rotateZ.toFixed(2)}deg)`,
        `scale(${scale.toFixed(4)})`,
      ].join(" ");
      motion.style.opacity = opacity.toFixed(3);

      if (!booted) {
        motion.classList.add("is-live");
        booted = true;
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="lp-hero-shot" ref={frameRef}>
      <div className="lp-hero-shot-motion" ref={motionRef}>
        <Image
          src="/dasbaord.png"
          alt="ArcFlows dashboard, locks and vesting on Arc"
          width={1920}
          height={1080}
          quality={95}
          sizes="(max-width: 1440px) 100vw, 1440px"
          priority
        />
      </div>
    </div>
  );
}
