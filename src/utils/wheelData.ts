import type { FlavorWheelData, WheelSegment } from '../types';

function flattenToSegments(
  data: FlavorWheelData,
  options: { startAngleDeg: number; clockwise: boolean }
): WheelSegment[] {
  const segments: WheelSegment[] = [];
  const total = 360;
  const keys = Object.keys(data);
  const step = total / keys.length;
  const sign = options.clockwise ? 1 : -1;

  keys.forEach((catId, i) => {
    const cat = data[catId];
    const a0 = options.startAngleDeg + i * step * sign;
    const a1 = options.startAngleDeg + (i + 1) * step * sign;

    segments.push({
      id: catId,
      ring: 1,
      name: cat.name,
      description: cat.description,
      startAngle: a0,
      endAngle: a1,
      categoryId: catId,
    });

    if (!cat.children) return;
    const subKeys = Object.keys(cat.children);
    const subStep = step / subKeys.length;

    subKeys.forEach((subId, j) => {
      const sub = cat.children![subId];
      const b0 = a0 + j * subStep * sign;
      const b1 = a0 + (j + 1) * subStep * sign;

      segments.push({
        id: `${catId}-${subId}`,
        ring: 2,
        name: sub.name,
        description: sub.description,
        startAngle: b0,
        endAngle: b1,
        parentId: catId,
        categoryId: catId,
      });

      if (!sub.children) return;
      const leafKeys = Object.keys(sub.children);
      const leafStep = subStep / leafKeys.length;

      leafKeys.forEach((leafId, k) => {
        const leaf = sub.children![leafId];
        const c0 = b0 + k * leafStep * sign;
        const c1 = b0 + (k + 1) * leafStep * sign;

        segments.push({
          id: `${catId}-${subId}-${leafId}`,
          ring: 3,
          name: leaf.name,
          description: leaf.description,
          startAngle: c0,
          endAngle: c1,
          parentId: `${catId}-${subId}`,
          categoryId: catId,
        });
      });
    });
  });

  return segments;
}

export function buildWheelSegments(data: FlavorWheelData): WheelSegment[] {
  return flattenToSegments(data, { startAngleDeg: 0, clockwise: true });
}

export function getSegmentsByRing(segments: WheelSegment[], ring: 1 | 2 | 3): WheelSegment[] {
  return segments.filter((s) => s.ring === ring);
}
