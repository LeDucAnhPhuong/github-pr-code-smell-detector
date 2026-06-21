"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single client-side motion controller for the landing page.
 *
 * The section components stay Server Components — they only carry `data-*`
 * hooks. This leaf reads those hooks once on mount and wires GSAP:
 *   data-hero            → element joins the hero intro timeline (plays on load)
 *   data-reveal          → fade-up once when it scrolls into view
 *   data-reveal-stagger  → its direct children fade-up in sequence on enter
 *   data-count="42"      → numeric text counts up from 0 when it enters view
 *
 * Motion is motivated, not decorative: the hero timeline establishes reading
 * order, staggered reveals narrate each section, count-ups draw the eye to the
 * figures. Everything collapses to static under prefers-reduced-motion.
 *
 * FOUC is prevented by an inline <head> script (see layout.tsx) that adds the
 * `js-motion` class before first paint; globals.css hides the hooked elements
 * until GSAP reveals them.
 */
export function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion (or the unlikely case the class never applied): make sure
    // every hooked element is simply visible, no animation.
    if (reduce) {
      gsap.set(
        "[data-hero], [data-reveal], [data-reveal-stagger] > *",
        { opacity: 1, y: 0, clearProps: "transform" },
      );
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        el.textContent = el.dataset.count ?? el.textContent;
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const easeOut = "power3.out";

    const ctx = gsap.context(() => {
      // ── Hero intro: a single timeline establishes the reading order ──────
      const heroEls = gsap.utils.toArray<HTMLElement>("[data-hero]");
      if (heroEls.length) {
        gsap.timeline({ delay: 0.08 }).fromTo(
          heroEls,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: easeOut, stagger: 0.11 },
        );
      }

      // ── Single elements: fade-up once on enter ──────────────────────────
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: easeOut,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          },
        );
      });

      // ── Staggered groups: children narrate the section in sequence ──────
      gsap.utils.toArray<HTMLElement>("[data-reveal-stagger]").forEach((group) => {
        const items = group.querySelectorAll<HTMLElement>(":scope > *");
        gsap.fromTo(
          items,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: easeOut,
            stagger: 0.09,
            scrollTrigger: { trigger: group, start: "top 80%", once: true },
          },
        );
      });

      // ── Count-ups: pull the eye to the figures ──────────────────────────
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = parseFloat(el.dataset.count ?? "0");
        if (Number.isNaN(target)) return;
        const suffix = el.dataset.countSuffix ?? "";
        const proxy = { v: 0 };
        el.textContent = `0${suffix}`;
        gsap.to(proxy, {
          v: target,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(proxy.v)}${suffix}`;
          },
        });
      });

      // Layout settled (fonts/images) — recompute trigger positions.
      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, []);

  return null;
}
