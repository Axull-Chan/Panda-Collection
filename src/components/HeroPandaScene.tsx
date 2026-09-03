/**
 * Looping hero video: a sleeping panda illustration, gently animated
 * (drifting leaves, floating "Zzz"), generated with Pika and looped natively
 * via the <video> element instead of a hand-built CSS animation.
 */
export function HeroPandaScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e9e8ca]">
      <video
        className="h-full w-full object-cover"
        src="/videos/hero-sleepy-panda.mp4"
        poster="/images/hero-sleepy-panda-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
}
