import { motion } from "framer-motion";

/**
 * Looping hero animation: a panda sprite held at a fixed position with a
 * gentle walking bob, over a Myeongdong-style pixel-art street that scrolls
 * infinitely underneath it — the classic side-scroller "treadmill" trick,
 * rather than a single AI-generated video clip. Both images were generated
 * for free via Pollinations.AI's no-key image endpoint; the panda's flat
 * background was removed with a small local script (chroma key + despill).
 *
 * The background div is intentionally 200% wide with two identical tiles
 * (`background-size: 50% 100%`) so animating its own transform from 0% to
 * -50% moves it exactly one tile-width — a seamless, resolution-independent
 * loop with no fixed pixel math.
 */
export function HeroPandaWalk() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1420]">
      <motion.div
        className="absolute inset-y-0 left-0 h-full w-[200%]"
        style={{
          backgroundImage: "url(/images/hero-myeongdong-bg.png)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "50% 100%",
          imageRendering: "pixelated",
        }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.img
        src="/images/hero-panda-sprite.png"
        alt=""
        aria-hidden="true"
        className="absolute bottom-[8%] left-[20%] w-[13%] min-w-[90px] max-w-[220px]"
        style={{ imageRendering: "pixelated", scaleX: -1 }}
        animate={{ y: ["0%", "-6%", "0%"], rotate: [-2, 2, -2] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,20,32,0.55) 0%, transparent 14%, transparent 86%, rgba(26,20,32,0.55) 100%)",
        }}
      />
    </div>
  );
}
