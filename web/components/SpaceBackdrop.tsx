/**
 * Fixed deep-space backdrop: nebula wash, three parallax star layers,
 * a planet limb on the horizon, and two comets. Pure CSS — no images,
 * no client JS.
 */
export function SpaceBackdrop() {
  return (
    <div aria-hidden className="space-backdrop">
      <div className="space-nebula" />
      <div className="space-stars-far" />
      <div className="space-stars-mid" />
      <div className="space-stars" />
      <div className="space-limb" />
      <div className="space-floor" />
      <div className="space-comet" />
      <div className="space-comet space-comet-2" />
    </div>
  );
}
