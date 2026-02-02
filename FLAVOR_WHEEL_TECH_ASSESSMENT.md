# Technical Assessment: Building a Flavor Wheel App Like flavorwheel.app

## 1. What flavorwheel.app Does

**[Taster's Flavor Wheels](https://flavorwheel.app/)** is an interactive, responsive web app that presents:

- **Coffee Flavor Wheel** (and Tea) – a radial “wheel” of flavor categories and sub-flavors based on standards like the [SCA Coffee Taster's Flavor Wheel](https://sca.coffee/research/coffee-tasters-flavor-wheel).
- **Nested tiers**: inner ring = broad categories (e.g. Fruity, Roasted, Sweet, Floral), outer ring = specific descriptors (e.g. Berry, Citrus, Blackberry, Raspberry).
- **Interaction**: “Tap to rotate” – the wheel can be rotated (likely drag/touch) so users can explore all segments.
- **Responsive**: Works across phones, tablets, and desktops.

So the product is: **interactive radial flavor taxonomy + responsive layout + touch/mouse rotation**.

---

## 2. Likely Tech Stack (Assessment)

| Layer | Likely approach | Why |
|-------|-----------------|-----|
| **Rendering** | **SVG** | Radial segments, crisp at any size, accessible, styleable with CSS. |
| **Layout / structure** | **D3.js** or custom JS | D3 is common for flavor wheels (e.g. [d3-flavour](https://github.com/morcmarc/d3-flavour), [Interactive Wine Aroma Wheel](https://github.com/JoshuaPaulBarnard/Interactive_Wine_Aroma_Wheel)); good for arcs, labels, and data-driven SVG. |
| **Interactivity** | **Pointer Events** (with mouse/touch fallback) | Single API for mouse + touch + stylus; “tap to rotate” = pointer down → move → up to compute rotation. |
| **Responsiveness** | **SVG `viewBox` + fluid width** | One coordinate system; container controls size. No fixed pixel dimensions on the wheel itself. |
| **Build** | **Bundler (e.g. Webpack/Vite)** | ES modules, optional TypeScript, tree-shaking. |
| **Framework** | **Vanilla JS or React/Vue** | The [DanGe42/flavor-wheel](https://github.com/DanGe42/flavor-wheel) library is framework-agnostic; flavorwheel.app could be vanilla or a small SPA. |

So: **SVG + (D3 or custom arcs) + Pointer Events + responsive SVG container** is the core tech.

---

## 3. How to Implement a Similar App (Responsive, All Devices)

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Responsive container (e.g. aspect-ratio: 1; max 90vmin)│
│  ┌───────────────────────────────────────────────────┐  │
│  │  <svg viewBox="0 0 800 800" preserveAspectRatio>   │  │
│  │    • Wheel arcs (path or D3-generated)             │  │
│  │    • Labels (possibly rotated per segment)         │  │
│  │    • Optional center / legend                      │  │
│  └───────────────────────────────────────────────────┘  │
│  ← Pointer/touch handlers for rotation                  │
└─────────────────────────────────────────────────────────┘
```

- **One SVG**, one `viewBox` (e.g. `0 0 800 800`).
- **Width/height**: e.g. `width="100%"` and `height="auto"` (or `height="100%"` inside a square aspect-ratio box) so the wheel scales with the container.
- **CSS**: Use a square or near-square responsive container (e.g. `max-width: min(90vmin, 800px)`, `aspect-ratio: 1`) so it looks good on mobile and desktop.

### 3.2 Responsive SVG Pattern

```html
<div class="wheel-container">
  <svg viewBox="0 0 800 800" class="wheel-svg">
    <!-- arcs and labels -->
  </svg>
</div>
```

```css
.wheel-container {
  width: 100%;
  max-width: min(90vmin, 800px);
  aspect-ratio: 1;
  margin: 0 auto;
  touch-action: none; /* avoid browser drag/zoom stealing */
}

.wheel-svg {
  width: 100%;
  height: 100%;
  display: block;
}
```

- **`viewBox`** keeps a fixed coordinate system (e.g. 800×800); the browser scales it to the container.
- **`touch-action: none`** on the container helps you handle drag/rotate yourself without the browser scrolling or zooming.

### 3.3 Drawing the Wheel

**Option A – D3.js**

- Use **D3 arc generators** (`d3.arc()`) for each segment.
- Data: array of `{ id, label, parentId?, startAngle, endAngle }` (or derive angles from category counts).
- Inner/outer radius for 2–3 tiers (e.g. inner ring = categories, outer = descriptors).
- **D3** can also help with label placement and rotation.

**Option B – Vanilla JS + SVG `<path>`**

- Same data model; compute arc paths with `Math` (e.g. polar to Cartesian: `x = cx + r*cos(θ)`, `y = cy + r*sin(θ)`).
- Use `<path d="M … A …">` for each segment. Slower to build by hand but no dependency.

**Option C – Existing library**

- **[flavor-wheel](https://github.com/DanGe42/flavor-wheel)** (npm: `flavor-wheel`): radial chart with config (e.g. `gridRadius`, `viewWidth`, `labels`); good if your data matches its shape.
- **[d3-flavour](https://github.com/morcmarc/d3-flavour)**: small D3 add-on for flavour wheels.

For a **custom SCA-style** wheel with many segments and two rings, D3 or a small D3-based helper is the most practical.

### 3.4 “Tap to Rotate” (Drag to Rotate)

- **Pointer Events**: `pointerdown`, `pointermove`, `pointerup`, `pointercancel` (and optionally `pointerleave`).
- **Logic**:
  - On **pointerdown**: store start angle (e.g. `Math.atan2(y - cy, x - cx)`).
  - On **pointermove**: compute current angle; `deltaAngle = current - start`; apply rotation to the **wheel group** (e.g. `<g transform="rotate(angle 400 400)">`).
  - On **pointerup**: persist current rotation (and optionally inertia).
- **Touch**: same logic; use `event.clientX/clientY` (or `event.targetTouches[0]` if not using Pointer Events). For multi-touch you could add pinch-to-zoom later.
- **Accessibility**: support keyboard (e.g. arrow keys to rotate) and ensure focusable elements/labels if you add click-to-select.

### 3.5 Performance and Polish

- **Throttle** `pointermove` (e.g. requestAnimationFrame or 30ms) so rotation stays smooth on low-end devices.
- Prefer **CSS transforms** or **SVG `transform`** on a single `<g>` for rotation; avoid changing hundreds of attributes per frame.
- **Reduce reflows**: keep the wheel in one SVG subtree; don’t resize the container during drag.
- **Font size**: use relative units or `em` for labels so they scale with the SVG; consider a minimum font size (e.g. `clamp(10px, 2vw, 14px)`) for readability on small screens.

### 3.6 Suggested Stack for Your Own App

| Choice | Suggestion | Reason |
|--------|------------|--------|
| **Framework** | React or Vue (or vanilla) | Component for wheel + future screens (e.g. “Honey” wheel, filters). |
| **Rendering** | SVG + D3 (arcs + optional labels) | Fast to build, flexible, same approach as many reference apps. |
| **Build** | Vite | Fast, simple, good DX. |
| **State** | Local component state (rotation, selected segment) | No need for Redux/Pinia for a single wheel. |
| **Data** | JSON/TS: tiers and segments (e.g. SCA-style or custom honey/flavor taxonomy). | Easy to maintain and swap wheels. |
| **Responsive** | Single SVG + viewBox + fluid container + `touch-action: none` | One implementation for all breakpoints. |
| **PWA (optional)** | Workbox + manifest | “Add to home screen” and offline shell if you want app-like behavior. |

---

## 4. Responsiveness Checklist

- [ ] **Single SVG** with `viewBox`; no fixed pixel sizes for the wheel content.
- [ ] **Container**: width + aspect-ratio (e.g. 1:1) + max-width so it fits phones and desktops.
- [ ] **Touch**: Pointer Events (or touch + mouse); `touch-action: none` on the wheel area.
- [ ] **Labels**: scale with SVG; consider hiding or abbreviating on very small viewports if needed.
- [ ] **Hit targets**: ensure segments or buttons are at least ~44px for touch.
- [ ] **Viewport meta**: `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- [ ] **Test**: real devices (iOS Safari, Android Chrome) and DevTools device emulation.

---

## 5. References

- [flavorwheel.app](https://flavorwheel.app/) – reference product.
- [SCA Coffee Taster's Flavor Wheel](https://sca.coffee/research/coffee-tasters-flavor-wheel) – standard taxonomy.
- [DanGe42/flavor-wheel](https://github.com/DanGe42/flavor-wheel) – npm library (Webpack + Babel, SVG + D3-style config).
- [d3-flavour](https://github.com/morcmarc/d3-flavour) – small D3 flavour wheel module.
- [Interactive Wine Aroma Wheel (D3)](https://github.com/JoshuaPaulBarnard/Interactive_Wine_Aroma_Wheel) – similar radial interaction.
- [Creating a Panning Effect for SVG (CSS-Tricks)](https://css-tricks.com/creating-a-panning-effect-for-svg/) – viewBox and panning.
- Pointer Events + responsive SVG: use **one viewBox**, **fluid container**, and **transform on a group** for rotation.

---

## 6. Next Steps for “Honey Taste” / Your Project

1. **Define data**: e.g. honey or generic flavor taxonomy (categories + descriptors) in JSON/TS.
2. **Scaffold**: Vite + React (or Vue) + TypeScript; one page with a square container and empty SVG.
3. **Implement wheel**: D3 arcs (or flavor-wheel lib) from your data; single `<g>` for rotation.
4. **Add rotation**: Pointer Events → compute angle delta → apply `rotate(angle cx cy)` to the group.
5. **Responsive pass**: container + viewBox + touch-action; test on real devices.
6. **Optional**: segment click (e.g. show tooltip or detail), multiple wheels (Coffee / Tea / Honey), or PWA.

If you tell me your preferred stack (e.g. React + TypeScript + Vite) and whether you want a “honey” or “coffee” style wheel first, I can outline concrete file structure and code snippets for your repo.
