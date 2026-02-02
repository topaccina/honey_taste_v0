/** Sunburst-style: one base color per top-level category, lighter for inner rings. */
const CATEGORY_BASE: Record<string, string> = {
  vegetale: '#4a7c4a',
  animale: '#8b6914',
  floreale: '#b85c7a',
  fruttato: '#c46838',
  caldo: '#c9a227',
  aromatico: '#6b6b9e',
  chimico: '#5c6b6b',
};

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount);
  const b = Math.min(255, (n & 0xff) + (255 - (n & 0xff)) * amount);
  return `#${(0x1000000 + Math.round(r) * 0x10000 + Math.round(g) * 0x100 + Math.round(b)).toString(16).slice(1)}`;
}

export function getSegmentFill(categoryId: string, ring: 1 | 2 | 3): string {
  const base = CATEGORY_BASE[categoryId] ?? '#888';
  if (ring === 1) return base;
  if (ring === 2) return lighten(base, 0.2);
  return lighten(base, 0.38);
}
