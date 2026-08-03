// Base-stat bar colour. A continuous hue ramp (red → orange → yellow → green →
// blue) so the colour shifts fluidly with the value instead of snapping between
// tiers. Blue is reserved for the very top of the range.

/** HSL colour string for a base-stat value (roughly 1–160+). */
export function statColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 160)); // 0 at min, 1 near 160+
  const hue = Math.round(t * 220); // 0=red … 110=green … 220=blue
  return `hsl(${hue} 72% 46%)`;
}
