"use client";

import { useEffect, useRef } from "react";

/**
 * Taste-Moment „word-highlight“: Eine Aussage ruht in halber Tinte und wird Wort für Wort
 * dunkel, während sie die Bildschirmmitte passiert. Läuft beim Hochscrollen zurück.
 * Ohne JavaScript oder mit reduzierter Bewegung steht der ganze Satz in voller Tinte.
 */
export function WordHighlight({
  text,
  accent = [],
  as: Tag = "p",
  className = "",
  from = 0.85,
  to = 0.45,
}: {
  text: string;
  accent?: string[];
  as?: "p" | "h2";
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(/\s+/);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>(".mo-w"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      spans.forEach((s) => s.classList.add("is-on"));
      return;
    }
    el.classList.add("mo-wh--live");
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * from;
      const end = vh * to;
      const t = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, start - end + r.height)));
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const k = atEnd ? spans.length : Math.round(t * spans.length);
      if (k === last) return;
      last = k;
      spans.forEach((s, i) => s.classList.toggle("is-on", i < k));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    let listening = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !listening) {
          listening = true;
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          update();
        } else if (!entry.isIntersecting && listening) {
          listening = false;
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
          update();
        }
      },
      { rootMargin: "20% 0px 20% 0px" },
    );
    io.observe(el);
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [from, to]);

  return (
    <Tag ref={ref as React.Ref<HTMLParagraphElement & HTMLHeadingElement>} className={`mo-wh ${className}`}>
      {words.map((w, i) => {
        const bare = w.replace(/[.,;:!?…]+$/, "");
        const isAccent = accent.includes(bare);
        return (
          <span key={i}>
            <span className={`mo-w${isAccent ? " mo-w--accent" : ""}`}>{w}</span>
            {i < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </Tag>
  );
}
