import { useEffect } from "react";
import Lenis from "lenis";

export function useLenis() {
  useEffect(() => {
    // Respect reduced-motion preferences; ?no-smooth also disables smooth
    // scrolling (useful for automated testing).
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const disabled = new URLSearchParams(window.location.search).has("no-smooth");
    if (prefersReduced || disabled) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
}
