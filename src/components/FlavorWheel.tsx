import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WheelSegment } from '../types';
import { buildWheelSegments, getSegmentsByRing } from '../utils/wheelData';
import { describeArc, midAngle, polarToCart } from '../utils/arc';
import { getSegmentFill } from '../utils/colors';
import wheelData from '../../data/flavor_wheel_it2_hierarchical.json';
import './FlavorWheel.css';

const VIEW_SIZE = 800;
const CX = VIEW_SIZE / 2;
const CY = VIEW_SIZE / 2;

/* Radii: ring 3 deeper to fit long labels (e.g. acido isovalerianico). */
const R1_INNER = 76;
const R1_OUTER = 186;
const R2_INNER = 186;
const R2_OUTER = 318;
const R3_INNER = 318;
const R3_OUTER = 399;

const RING_RADII: Record<1 | 2 | 3, { inner: number; outer: number }> = {
  1: { inner: R1_INNER, outer: R1_OUTER },
  2: { inner: R2_INNER, outer: R2_OUTER },
  3: { inner: R3_INNER, outer: R3_OUTER },
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_SENSITIVITY = 0.002;

function getRadius(ring: 1 | 2 | 3): { inner: number; outer: number } {
  return RING_RADII[ring];
}

/**
 * Tangential label: text runs along the arc. Upright in screen space:
 * flip 180° when segment is on the left half (so text is never upside down).
 */
function tangentialLabelRotation(midDeg: number, wheelRotation: number): number {
  const alongArc = midDeg + 90;
  const screenAngle = (alongArc + wheelRotation + 360) % 360;
  const upsideDown = screenAngle > 90 && screenAngle < 270;
  return upsideDown ? alongArc + 180 : alongArc;
}

/** Position tooltip toward viewport center so it never covers the sector label. */
function getTooltipPosition(segmentViewportX: number, segmentViewportY: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
  const dx = vw - segmentViewportX;
  const dy = vh - segmentViewportY;
  const len = Math.hypot(dx, dy) || 1;
  const offset = 100;
  return {
    x: segmentViewportX + (dx / len) * offset,
    y: segmentViewportY + (dy / len) * offset,
  };
}

export default function FlavorWheel() {
  const segments = useMemo(
    () => buildWheelSegments(wheelData as import('../types').FlavorWheelData),
    []
  );
  const byRing = useMemo(
    () => ({
      1: getSegmentsByRing(segments, 1),
      2: getSegmentsByRing(segments, 2),
      3: getSegmentsByRing(segments, 3),
    }),
    [segments]
  );

  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{
    seg: WheelSegment;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{ startAngle: number; startRotation: number } | null>(null);
  const pinchRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const angleFromEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    const target = e.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_SIZE;
    const dx = x - CX;
    const dy = y - CY;
    return ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.target as SVGElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        startAngle: angleFromEvent(e),
        startRotation: rotation,
      };
    },
    [angleFromEvent, rotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const currentAngle = angleFromEvent(e);
      let delta = currentAngle - dragRef.current.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      setRotation(dragRef.current.startRotation + delta);
    },
    [angleFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - e.deltaY * ZOOM_SENSITIVITY)));
  }, []);

  const getTouchDistance = useCallback((touches: React.TouchList | TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          initialDistance: getTouchDistance(e.touches),
          initialZoom: zoomRef.current,
        };
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const scale =
          getTouchDistance(e.touches) / pinchRef.current.initialDistance;
        const newZoom = Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, pinchRef.current.initialZoom * scale)
        );
        setZoom(newZoom);
      }
    };
    const handleTouchEndWithE = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEndWithE, { passive: true });
    el.addEventListener('touchcancel', handleTouchEndWithE, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEndWithE);
      el.removeEventListener('touchcancel', handleTouchEndWithE);
    };
  }, [getTouchDistance]);

  const handleSegmentPointerEnter = useCallback(
    (seg: WheelSegment, e: React.PointerEvent) => {
      if (dragRef.current) return;
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      const mid = midAngle(seg.startAngle, seg.endAngle);
      const r = (RING_RADII[seg.ring].inner + RING_RADII[seg.ring].outer) / 2;
      const [sx, sy] = polarToCart(CX, CY, r, mid);
      const segX = rect.left + (sx / VIEW_SIZE) * rect.width;
      const segY = rect.top + (sy / VIEW_SIZE) * rect.height;
      const { x, y } = getTooltipPosition(segX, segY);
      setTooltip({ seg, x, y });
    },
    []
  );

  const handleSegmentPointerMove = useCallback(
    (seg: WheelSegment, e: React.PointerEvent) => {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      const mid = midAngle(seg.startAngle, seg.endAngle);
      const r = (RING_RADII[seg.ring].inner + RING_RADII[seg.ring].outer) / 2;
      const [sx, sy] = polarToCart(CX, CY, r, mid);
      const segX = rect.left + (sx / VIEW_SIZE) * rect.width;
      const segY = rect.top + (sy / VIEW_SIZE) * rect.height;
      const { x, y } = getTooltipPosition(segX, segY);
      setTooltip((prev) =>
        prev?.seg.id === seg.id ? { seg, x, y } : prev
      );
    },
    []
  );

  const handleSegmentPointerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleSegmentClick = useCallback((seg: WheelSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tooltip?.seg.id === seg.id) setTooltip(null);
    else {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      const mid = midAngle(seg.startAngle, seg.endAngle);
      const r = (RING_RADII[seg.ring].inner + RING_RADII[seg.ring].outer) / 2;
      const [sx, sy] = polarToCart(CX, CY, r, mid);
      const segX = rect.left + (sx / VIEW_SIZE) * rect.width;
      const segY = rect.top + (sy / VIEW_SIZE) * rect.height;
      const { x, y } = getTooltipPosition(segX, segY);
      setTooltip({ seg, x, y });
    }
  }, [tooltip]);

  return (
    <div className="flavor-wheel-app">
      <div className="flavor-wheel-main">
        <div
          ref={wrapperRef}
          className="wheel-wrapper"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          onWheel={handleWheel}
        >
          <div className="wheel-container">
            <svg
              className="wheel-svg"
              viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <g transform={`rotate(${rotation} ${CX} ${CY})`}>
                {([1, 2, 3] as const).map((ring) => {
                  const { inner, outer } = getRadius(ring);
                  return (byRing[ring] as WheelSegment[]).map((seg) => {
                    const path = describeArc(CX, CY, inner, outer, seg.startAngle, seg.endAngle);
                    return (
                      <path
                        key={seg.id}
                        d={path}
                        className="segment"
                        style={{ fill: getSegmentFill(seg.categoryId, seg.ring) }}
                        onClick={(e) => handleSegmentClick(seg, e)}
                        onPointerEnter={(e) => handleSegmentPointerEnter(seg, e)}
                        onPointerMove={(e) => handleSegmentPointerMove(seg, e)}
                        onPointerLeave={handleSegmentPointerLeave}
                        aria-label={seg.name}
                      />
                    );
                  });
                })}

                {([1, 2, 3] as const).map((ring) =>
                  (byRing[ring] as WheelSegment[]).map((seg) => {
                    const mid = midAngle(seg.startAngle, seg.endAngle);
                    const r =
                      (RING_RADII[ring].inner + RING_RADII[ring].outer) / 2;
                    const [x, y] = polarToCart(CX, CY, r, mid);
                    const useVertical = ring === 2 || ring === 3 || seg.name.length > 15;
                    const rot = useVertical
                      ? tangentialLabelRotation(mid, rotation)
                      : -rotation;
                    const isOuterTwoLine = ring === 3 && seg.name.includes(' ');
                    const [line1, line2] = isOuterTwoLine
                      ? (() => {
                          const idx = seg.name.indexOf(' ');
                          return idx < 0
                            ? [seg.name, '']
                            : [seg.name.slice(0, idx), seg.name.slice(idx + 1)];
                        })()
                      : [seg.name, ''];
                    return (
                      <text
                        key={`label-${seg.id}`}
                        x={x}
                        y={y}
                        className={`label label-ring${ring}${isOuterTwoLine ? ' label-ring3-two-line' : ''}`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${rot} ${x} ${y})`}
                      >
                        {isOuterTwoLine ? (
                          <>
                            <tspan x={x} dy={line2 ? '-0.45em' : 0}>
                              {line1}
                            </tspan>
                            {line2 && (
                              <tspan x={x} dy="1.05em">
                                {line2}
                              </tspan>
                            )}
                          </>
                        ) : (
                          seg.name
                        )}
                      </text>
                    );
                  })
                )}

                <g transform={`rotate(${-rotation} ${CX} ${CY})`}>
                  <circle cx={CX} cy={CY} r={R1_INNER - 4} className="center-circle" />
                  <text
                    x={CX}
                    y={CY}
                    className="center-label"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan x={CX} dy="-0.35em">I sapori</tspan>
                    <tspan x={CX} dy="1.1em">del Miele</tspan>
                    <tspan x={CX} dy="1.4em" className="center-hint">Tocca per ruotare</tspan>
                    <tspan x={CX} dy="1.1em" className="center-hint">Pinch o scroll per zoomare</tspan>
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>

        {tooltip && (
          <div
            className="wheel-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -50%)',
            }}
            role="tooltip"
          >
            <strong className="wheel-tooltip-title">{tooltip.seg.name}</strong>
            <p className="wheel-tooltip-desc">{tooltip.seg.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
