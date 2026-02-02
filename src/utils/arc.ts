/** Degrees with 0 at top (12 o'clock), clockwise. */
export function degToRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

export function polarToCart(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = degToRad(deg);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** SVG path for an arc from startDeg to endDeg (degrees, 0 at top, clockwise). */
export function describeArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const [x1, y1] = polarToCart(cx, cy, rOuter, startDeg);
  const [x2, y2] = polarToCart(cx, cy, rOuter, endDeg);
  const [x3, y3] = polarToCart(cx, cy, rInner, endDeg);
  const [x4, y4] = polarToCart(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** Mid angle in degrees for label placement. */
export function midAngle(startDeg: number, endDeg: number): number {
  return (startDeg + endDeg) / 2;
}
