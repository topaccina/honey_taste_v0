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

/* Circular arrow around center (rotation hint) */
const ROTATE_ARROW_R = 58;
const ROTATE_ARROW_START = 210;
const ROTATE_ARROW_END = 330;

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

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

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
                  {/* Circular arrow around center to suggest rotation */}
                  <g className="center-rotate-arrow">
                    {(() => {
                      const [x1, y1] = polarToCart(CX, CY, ROTATE_ARROW_R, ROTATE_ARROW_START);
                      const [x2, y2] = polarToCart(CX, CY, ROTATE_ARROW_R, ROTATE_ARROW_END);
                      const [tx, ty] = polarToCart(CX, CY, ROTATE_ARROW_R + 12, ROTATE_ARROW_END);
                      const [bx, by] = polarToCart(CX, CY, ROTATE_ARROW_R - 8, ROTATE_ARROW_END);
                      const [lx, ly] = polarToCart(CX, CY, ROTATE_ARROW_R - 8, ROTATE_ARROW_END + 12);
                      const [rx, ry] = polarToCart(CX, CY, ROTATE_ARROW_R - 8, ROTATE_ARROW_END - 12);
                      return (
                        <>
                          <path
                            d={`M ${x1} ${y1} A ${ROTATE_ARROW_R} ${ROTATE_ARROW_R} 0 0 1 ${x2} ${y2}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path d={`M ${tx} ${ty} L ${lx} ${ly} L ${rx} ${ry} Z`} className="center-rotate-arrow-head" />
                        </>
                      );
                    })()}
                  </g>
                  <text
                    x={CX}
                    y={CY}
                    className="center-label"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan x={CX} dy="-0.35em">I sapori</tspan>
                    <tspan x={CX} dy="1.1em">del Miele</tspan>
                  </text>
                  <g
                    className="center-reset-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    style={{ cursor: 'pointer' }}
                    aria-label="Ripristina vista"
                  >
                    <rect
                      x={CX - 24}
                      y={CY + 18}
                      width={48}
                      height={20}
                      rx={6}
                      ry={6}
                      className="center-reset-btn-bg"
                    />
                    <text
                      x={CX}
                      y={CY + 32}
                      className="center-reset-btn-text"
                      textAnchor="middle"
                    >
                      Reset
                    </text>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
