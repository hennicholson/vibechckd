// Generator for per-tab intro Lotties — retraced from the sidebar
// icons in src/lib/dashboard-nav.tsx and animated with a trim-path
// draw-on (the same signature move check-intro.json uses for the
// checkmark). Each animation:
//
//   • Frame  0-50: primary outline TRIM-DRAWS on (smooth quart-out)
//   • Frame 35-72: accent shape enters (trim-draw or scale pop)
//   • Frame 60-86: secondary accent enters
//   • Frame 95-130: full mark breathes (subtle scale 100→103→100)
//   • Frame 130-150: hold, ready for crossfade
//
// All bodies are custom Lottie paths (not `rc` primitives) so the
// trim path starts at a designed corner and draws CW like a writing
// hand. Stroke width 18, round caps + joins, ink #171717.
//
// Run: node scripts/gen-tab-lotties.mjs

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "lottie");

const INK = [0.0902, 0.0902, 0.0902, 1];
const PAPER = [1, 1, 1, 1];

// SVG units → Lottie units. The icon at scale 22 spans 528 of a 720
// canvas, leaving ~96 of padding.
const S = 22;
const STROKE_W = 18;
// Tangent magnitude for a quarter-arc bezier of SVG radius r.
const TAN = (rSvg) => rSvg * S * 0.5523;
const R = TAN(2); // 24.3 — the rounded-corner k for r=2 SVG

const E = {
  smoothOut: { x: [0.16], y: [1] },
  smoothIn: { x: [0.3], y: [1] },
  quartOut: { x: [0.22], y: [1] },
  quartIn: { x: [0.36], y: [1] },
  overOut: { x: [0.34], y: [1.56] },
  overIn: { x: [0.64], y: [1] },
};

// SVG point → Lottie offset from the icon's center (12, 12).
const v = (x, y) => [(x - 12) * S, (y - 12) * S];

// ---------- shape primitives ----------

const staticVal = (k) => ({ a: 0, k });

function transform({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) {
  return {
    ty: "tr",
    p: { a: 0, k: p }, a: { a: 0, k: a }, s: { a: 0, k: s },
    r: { a: 0, k: r }, o: { a: 0, k: o },
    sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 },
  };
}

function stroke({ color = INK, width = STROKE_W } = {}) {
  return {
    ty: "st", c: { a: 0, k: color }, o: { a: 0, k: 100 }, w: { a: 0, k: width },
    lc: 2, lj: 2, ml: 4, nm: "Stroke",
  };
}

function fill({ color = INK } = {}) {
  return { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, nm: "Fill" };
}

function ellipse({ position = [0, 0], size = [40, 40] } = {}) {
  return { ty: "el", p: { a: 0, k: position }, s: { a: 0, k: size }, nm: "Ellipse" };
}

function pathShape({ vertices, inTans, outTans, closed = false }) {
  const i = inTans || vertices.map(() => [0, 0]);
  const o = outTans || vertices.map(() => [0, 0]);
  return {
    ty: "sh", ind: 0,
    ks: { a: 0, k: { i, o, v: vertices, c: closed } },
    nm: "Path",
  };
}

// Trim that draws the path on (end 0→100) starting at enterFrame.
function trim({ enterFrame, duration = 36 }) {
  return {
    ty: "tm",
    s: staticVal(0),
    e: { a: 1, k: [
      { t: enterFrame, s: [0], o: E.smoothOut, i: E.smoothIn },
      { t: enterFrame + duration, s: [100] },
    ]},
    o: staticVal(0), m: 1, nm: "Trim",
  };
}

function group(items, name = "Group") {
  return { ty: "gr", nm: name, it: items };
}

function shapeLayer({
  name, ind, ip = 0, op = 150,
  position = [360, 360, 0],
  opacity = staticVal(100),
  rotation = staticVal(0),
  scale = staticVal([100, 100, 100]),
  shapes,
}) {
  return {
    ddd: 0, ind, ty: 4, nm: name, sr: 1,
    ks: { o: opacity, r: rotation, p: staticVal(position), a: staticVal([0, 0, 0]), s: scale },
    ao: 0, shapes, ip, op, st: 0, bm: 0,
  };
}

function backgroundLayer(ind) {
  return shapeLayer({
    name: "Background", ind, position: [0, 0, 0],
    shapes: [
      group([
        { ty: "rc", p: { a: 0, k: [360, 360] }, s: { a: 0, k: [720, 720] }, r: { a: 0, k: 0 }, nm: "Rect" },
        fill({ color: PAPER }),
        transform(),
      ]),
    ],
  });
}

// Pop-in: opacity hold + overshoot scale.
function popIn({ enterFrame = 0, settleFrame, endFrame = 150 } = {}) {
  const settle = settleFrame ?? enterFrame + 32;
  const opacity =
    enterFrame <= 0
      ? staticVal(100)
      : { a: 1, k: [
          { t: 0, s: [0], h: 1 },
          { t: enterFrame, s: [100], h: 1 },
          { t: endFrame, s: [100] },
        ]};
  return {
    opacity,
    scale: { a: 1, k: [
      { t: enterFrame, s: [0, 0, 100], o: E.overOut, i: E.overIn },
      { t: settle, s: [110, 110, 100], o: E.quartOut, i: E.quartIn },
      { t: settle + 14, s: [100, 100, 100] },
    ]},
  };
}

// Subtle scale "breath" applied to the layer once the mark has fully
// drawn — gives the icon a small inhale at the end so the lockup
// feels alive rather than frozen. Returns the scale Animatable.
function breath({ baseFrame = 100, peakFrame = 116, endFrame = 134, peak = 103 }) {
  return { a: 1, k: [
    { t: baseFrame, s: [100, 100, 100], o: E.quartOut, i: E.quartIn },
    { t: peakFrame, s: [peak, peak, 100], o: E.quartOut, i: E.quartIn },
    { t: endFrame, s: [100, 100, 100] },
  ]};
}

// ---------- path builders ----------

// Closed rounded rect path centered at (cx, cy) with width/height and
// SVG-equivalent corner radius. CW from TL corner end (left edge top)
// so trim 0→100 draws CW starting at top-left.
function roundedRectPath({ cx = 0, cy = 0, w, h, rSvg = 2, closed = true } = {}) {
  const r = rSvg * S;
  const k = TAN(rSvg);
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const y0 = cy - h / 2, y1 = cy + h / 2;
  const verts = [
    [x0, y0 + r],     // V0: TL corner end (left edge top)
    [x0, y1 - r],     // V1: BL corner start
    [x0 + r, y1],     // V2: BL corner end
    [x1 - r, y1],     // V3: BR corner start
    [x1, y1 - r],     // V4: BR corner end
    [x1, y0 + r],     // V5: TR corner start
    [x1 - r, y0],     // V6: TR corner end
    [x0 + r, y0],     // V7: TL corner start (closes back to V0)
  ];
  const inT = [
    [0, -k],   // V0 (incoming from TL corner)
    [0, 0],    // V1
    [-k, 0],   // V2
    [0, 0],    // V3
    [0, k],    // V4
    [0, 0],    // V5
    [k, 0],    // V6
    [0, 0],    // V7
  ];
  const outT = [
    [0, 0],
    [0, k],
    [0, 0],
    [k, 0],
    [0, 0],
    [0, -k],
    [0, 0],
    [-k, 0],
  ];
  return { vertices: verts, inTans: inT, outTans: outT, closed };
}

// ---------- compositions ----------

// PROJECTS — clipboard outline. Body is an open custom path with a
// top notch where the clip sits. Clip is a pill (rounded rect 6×4)
// that trim-draws on after the body has nearly finished.
function buildProjects() {
  // Body coords use the icon center (12, 12) as origin. Body's actual
  // center in SVG is (12, 13). Body extents: x [5..19], y [5..21].
  // Open path, CW from notch right side going AROUND back to notch
  // left side. The notch spans x [9..15] on the top edge (y=5).
  //
  // Vertex sequence (CW from notch right):
  //   V0 (9, 5)   notch right         (-66, -154)
  //   V1 (15, 5)  → wait, going CW we head LEFT here from notch right.
  //   Actually let's go CCW (right-first) so the trim draws around CW
  //   visually. We'll start at notch LEFT and head right.
  //
  // Restart: open path, starts at notch LEFT, goes CW (= right along
  // top → down right → left along bottom → up left → ends at notch
  // RIGHT). That way the trim "writes" CW like a hand drawing.
  const t = R;
  const bodyVerts = [
    v(9, 5),     // V0: notch left (start)
    v(15, 5),    // wait, that's going right — that's CW from notch left
    // Actually the notch left is at x=9, notch right is at x=15. Going
    // from x=9 RIGHTWARD to x=15 means going across the notch (gap).
    // We want to AVOID drawing the notch. So start at NOTCH RIGHT,
    // go RIGHT to TR corner, around, end at NOTCH LEFT.
  ];
  // Reset — proper trace CW from notch right going right→down→left→up→notch left.
  const verts = [
    v(15, 5),    // V0: notch right
    v(17, 5),    // V1: top edge end before TR corner
    v(19, 7),    // V2: TR corner end (start of right edge)
    v(19, 19),   // V3: right edge end before BR corner
    v(17, 21),   // V4: BR corner end (start of bottom edge)
    v(7, 21),    // V5: bottom edge end before BL corner
    v(5, 19),    // V6: BL corner end (start of left edge)
    v(5, 7),     // V7: left edge end before TL corner
    v(7, 5),     // V8: TL corner end (start of top edge going right)
    v(9, 5),     // V9: notch left (end)
  ];
  const inT = [
    [0, 0],          // V0
    [0, 0],          // V1
    [0, -t],         // V2 (from TR arc, incoming UP-direction reversed)
    [0, 0],          // V3
    [t, 0],          // V4 (from BR arc, incoming RIGHT-direction reversed)
    [0, 0],          // V5
    [0, t],          // V6 (from BL arc, incoming DOWN-direction reversed)
    [0, 0],          // V7
    [-t, 0],         // V8 (from TL arc, incoming LEFT-direction reversed)
    [0, 0],          // V9
  ];
  const outT = [
    [0, 0],          // V0
    [t, 0],          // V1 (into TR arc going RIGHT)
    [0, 0],          // V2
    [0, t],          // V3 (into BR arc going DOWN)
    [0, 0],          // V4
    [-t, 0],         // V5 (into BL arc going LEFT)
    [0, 0],          // V6
    [0, -t],         // V7 (into TL arc going UP)
    [0, 0],          // V8
    [0, 0],          // V9
  ];

  const body = shapeLayer({
    name: "ClipboardBody", ind: 1,
    scale: breath({}),
    shapes: [
      group([
        pathShape({ vertices: verts, inTans: inT, outTans: outT, closed: false }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 0, duration: 52 }),
        transform(),
      ]),
    ],
  });

  // Clip — closed pill (rounded rect 6×4) at SVG center (12, 5).
  // Use rSvg=2 which equals half the height (4) so the short ends
  // are fully rounded → pill shape.
  const clipPath = roundedRectPath({ cx: 0, cy: -7 * S, w: 6 * S, h: 4 * S, rSvg: 2 });
  const clip = shapeLayer({
    name: "ClipboardClip", ind: 2,
    scale: breath({}),
    shapes: [
      group([
        pathShape(clipPath),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 38, duration: 32 }),
        transform(),
      ]),
    ],
  });

  return {
    v: "5.7.0", fr: 60, ip: 0, op: 150, w: 720, h: 720,
    nm: "projects-intro", ddd: 0, assets: [],
    layers: [clip, body, backgroundLayer(99)].map((l, i) => ({ ...l, ind: i + 1 })),
  };
}

// INBOX — chat bubble with tail + 3 dots. Body is a single closed
// custom path traced CW from the top-left so trim draws the outline
// like writing. Dots stagger in afterwards.
function buildInbox() {
  // Trace bubble outline CW from TL corner end (left edge top).
  // SVG path is: rounded rect + tail notch at bottom-left.
  const t = R;
  const verts = [
    v(3, 6),     // V0: TL corner end (left edge top going DOWN)
    v(3, 14),   // V1: left edge bottom before BL corner
    v(5, 16),   // V2: BL corner end (bottom edge start going RIGHT)
    v(9, 16),   // V3: bottom edge, just before tail begins
    v(9, 21),   // V4: tail tip (sharp corner)
    v(14, 16),  // V5: tail base on the right
    v(19, 16),  // V6: bottom edge ends before BR corner
    v(21, 14),  // V7: BR corner end (right edge bottom going UP)
    v(21, 6),   // V8: right edge top before TR corner
    v(19, 4),   // V9: TR corner end (top edge start going LEFT)
    v(5, 4),    // V10: top edge end before TL corner (closes to V0)
  ];
  const inT = [
    [0, -t],    // V0
    [0, 0],     // V1
    [-t, 0],    // V2
    [0, 0],     // V3
    [0, 0],     // V4 (sharp)
    [0, 0],     // V5
    [0, 0],     // V6
    [t, 0],     // V7
    [0, 0],     // V8
    [0, t],     // V9
    [0, 0],     // V10
  ];
  const outT = [
    [0, 0],     // V0
    [0, t],     // V1
    [0, 0],     // V2
    [0, 0],     // V3 (straight into tail)
    [0, 0],     // V4 (sharp)
    [0, 0],     // V5 (straight out of tail)
    [t, 0],     // V6
    [0, 0],     // V7
    [0, -t],    // V8
    [0, 0],     // V9
    [-t, 0],    // V10 (closes via TL arc back to V0)
  ];

  const bubble = shapeLayer({
    name: "Bubble", ind: 1,
    scale: breath({}),
    shapes: [
      group([
        pathShape({ vertices: verts, inTans: inT, outTans: outT, closed: true }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 0, duration: 60 }),
        transform(),
      ]),
    ],
  });

  // Typing dots — three small black dots inside the bubble. Stagger
  // pop in like keystrokes at 8f intervals after the bubble lands.
  function dot({ ind, svgX, enterFrame }) {
    const p = popIn({ enterFrame, settleFrame: enterFrame + 18 });
    return shapeLayer({
      name: `Dot${ind}`, ind,
      position: [360 + (svgX - 12) * S, 360 + (10 - 12) * S, 0],
      opacity: p.opacity, scale: p.scale,
      shapes: [
        group([
          ellipse({ position: [0, 0], size: [22, 22] }),
          fill({ color: INK }),
          transform(),
        ]),
      ],
    });
  }

  return {
    v: "5.7.0", fr: 60, ip: 0, op: 150, w: 720, h: 720,
    nm: "inbox-intro", ddd: 0, assets: [],
    layers: [
      dot({ ind: 1, svgX: 8, enterFrame: 56 }),
      dot({ ind: 2, svgX: 12, enterFrame: 64 }),
      dot({ ind: 3, svgX: 16, enterFrame: 72 }),
      bubble,
      backgroundLayer(99),
    ].map((l, i) => ({ ...l, ind: i + 1 })),
  };
}

// EARNINGS — wallet card. Rounded rect body trim-draws on, then the
// strip line trim-draws across the top, then the chip pops in.
function buildEarnings() {
  // Body at SVG center (12, 13), 20 wide × 14 tall.
  const bodyPath = roundedRectPath({ cx: 0, cy: 1 * S, w: 20 * S, h: 14 * S, rSvg: 2 });
  const body = shapeLayer({
    name: "Card", ind: 1,
    scale: breath({}),
    shapes: [
      group([
        pathShape(bodyPath),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 0, duration: 52 }),
        transform(),
      ]),
    ],
  });

  const strip = shapeLayer({
    name: "Strip", ind: 2,
    scale: breath({}),
    shapes: [
      group([
        pathShape({
          vertices: [v(2, 10), v(22, 10)],
          closed: false,
        }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 36, duration: 30 }),
        transform(),
      ]),
    ],
  });

  const chip = shapeLayer({
    name: "Chip", ind: 3,
    scale: breath({}),
    shapes: [
      group([
        pathShape({
          vertices: [v(16, 14), v(18, 14)],
          closed: false,
        }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 60, duration: 18 }),
        transform(),
      ]),
    ],
  });

  return {
    v: "5.7.0", fr: 60, ip: 0, op: 150, w: 720, h: 720,
    nm: "earnings-intro", ddd: 0, assets: [],
    layers: [chip, strip, body, backgroundLayer(99)].map((l, i) => ({ ...l, ind: i + 1 })),
  };
}

// JOBS — briefcase. Body (closed rounded rect 18×14) trim-draws on,
// then divider (the curved fold line across the middle), then handle
// (U-shape on top), then latch dot pops in. Mirrors the four sub-paths
// of the sidebar SVG icon.
function buildJobs() {
  const bodyPath = roundedRectPath({ cx: 0, cy: 1 * S, w: 18 * S, h: 14 * S, rSvg: 2 });
  const body = shapeLayer({
    name: "Briefcase", ind: 1,
    scale: breath({}),
    shapes: [
      group([
        pathShape(bodyPath),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 0, duration: 52 }),
        transform(),
      ]),
    ],
  });

  // Divider — curved fold line across the middle. SVG:
  //   M21 13.255 A23.93 23.93 0 0 1 12 15 c-3.183 0-6.22-.62-9-1.745
  // Goes from (21, 13.255) bowing down through (12, 15) to (3, 13.255).
  // Approximated as a 3-vertex cubic bezier with horizontal tangent at
  // the mid-point so the curve reads as a clean symmetric fold.
  const divider = shapeLayer({
    name: "Divider", ind: 2,
    scale: breath({}),
    shapes: [
      group([
        pathShape({
          vertices: [
            v(21, 13.255),   // right anchor
            v(12, 15),       // mid (lowest point)
            v(3, 13.255),    // left anchor
          ],
          inTans: [
            [0, 0],
            [80, 0],
            [80, 30],
          ],
          outTans: [
            [-80, 30],
            [-80, 0],
            [0, 0],
          ],
          closed: false,
        }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 32, duration: 38 }),
        transform(),
      ]),
    ],
  });

  // Handle — open U-path, SVG: M16 6 V4 a2 2 0 0 0-2-2 h-4 a2 2 0 0 0-2 2 v2
  const t = R;
  const handleVerts = [
    v(16, 6),    // V0: bottom-right of handle (sits on body's top edge)
    v(16, 4),    // V1: right edge top before TR corner
    v(14, 2),    // V2: TR corner end (top edge going LEFT)
    v(10, 2),    // V3: top edge end before TL corner
    v(8, 4),     // V4: TL corner end (left edge going DOWN)
    v(8, 6),     // V5: bottom-left of handle
  ];
  const handleIn = [
    [0, 0],      // V0
    [0, 0],      // V1
    [t, 0],      // V2
    [0, 0],      // V3
    [0, -t],     // V4
    [0, 0],      // V5
  ];
  const handleOut = [
    [0, 0],      // V0
    [0, -t],     // V1
    [0, 0],      // V2
    [-t, 0],     // V3
    [0, 0],      // V4
    [0, 0],      // V5
  ];

  const handle = shapeLayer({
    name: "Handle", ind: 3,
    scale: breath({}),
    shapes: [
      group([
        pathShape({ vertices: handleVerts, inTans: handleIn, outTans: handleOut, closed: false }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 50, duration: 34 }),
        transform(),
      ]),
    ],
  });

  // Latch — small dot at icon center (SVG (12, 12)), on the upper face
  // of the briefcase. Pops in last.
  const latchPop = popIn({ enterFrame: 82, settleFrame: 110 });
  const latch = shapeLayer({
    name: "Latch", ind: 4,
    opacity: latchPop.opacity,
    scale: latchPop.scale,
    shapes: [
      group([
        ellipse({ position: [0, 0], size: [22, 22] }),
        fill({ color: INK }),
        transform(),
      ]),
    ],
  });

  return {
    v: "5.7.0", fr: 60, ip: 0, op: 150, w: 720, h: 720,
    nm: "jobs-intro", ddd: 0, assets: [],
    layers: [latch, handle, divider, body, backgroundLayer(99)].map((l, i) => ({ ...l, ind: i + 1 })),
  };
}

// PORTFOLIO — archive/portfolio case. Bottom body (rounded rect) +
// shoulders that taper inward + small lid on top. Three traced paths
// mirror the sidebar SVG: body, shoulder-and-lid-base (one continuous
// stroke that flows smoothly), and the lid silhouette on top.
function buildPortfolio() {
  // Body: SVG rounded rect (3, 11) to (21, 21) → center (12, 16),
  // size 18×10, r=2. In Lottie offset from icon center (12, 12):
  // center (0, +4) ×S = (0, 88), size 396×220, r=44.
  const bodyPath = roundedRectPath({ cx: 0, cy: 4 * S, w: 18 * S, h: 10 * S, rSvg: 2 });
  const body = shapeLayer({
    name: "Body", ind: 1,
    scale: breath({}),
    shapes: [
      group([
        pathShape(bodyPath),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 0, duration: 50 }),
        transform(),
      ]),
    ],
  });

  // Shoulders + lid bottom — one smooth U-shape going UP from the body
  // top at (5, 11), curving inward through the left shoulder to (7, 7),
  // STRAIGHT across the lid's bottom edge to (17, 7), curving outward
  // through the right shoulder back DOWN to (19, 11).
  const t = R;
  const shoulderVerts = [
    v(5, 11),    // V0: left shoulder base (on body top)
    v(5, 9),     // V1: start of left shoulder arc
    v(7, 7),     // V2: end of left shoulder arc (motion: RIGHT)
    v(17, 7),    // V3: end of lid bottom edge (motion: RIGHT into arc)
    v(19, 9),    // V4: end of right shoulder arc (motion: DOWN)
    v(19, 11),   // V5: right shoulder base (on body top)
  ];
  const shoulderIn = [
    [0, 0],      // V0
    [0, 0],      // V1
    [-t, 0],     // V2: arc end coming from RIGHT direction
    [0, 0],      // V3
    [0, -t],     // V4: arc end coming from DOWN direction
    [0, 0],      // V5
  ];
  const shoulderOut = [
    [0, 0],      // V0
    [0, -t],     // V1: into arc going UP
    [0, 0],      // V2
    [t, 0],      // V3: into arc going RIGHT (smooth at V3 since incoming straight RIGHT)
    [0, 0],      // V4
    [0, 0],      // V5
  ];

  const shoulders = shapeLayer({
    name: "Shoulders", ind: 2,
    scale: breath({}),
    shapes: [
      group([
        pathShape({ vertices: shoulderVerts, inTans: shoulderIn, outTans: shoulderOut, closed: false }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 32, duration: 40 }),
        transform(),
      ]),
    ],
  });

  // Lid (top portion) — open inverted-U from (7, 7) UP through TL
  // corner across to TR corner DOWN to (17, 7).
  const lidVerts = [
    v(7, 7),     // W0: lid bottom-left (open)
    v(7, 5),     // W1: left edge top before TL corner
    v(9, 3),     // W2: TL corner end (motion: RIGHT)
    v(15, 3),   // W3: top edge end before TR corner
    v(17, 5),    // W4: TR corner end (motion: DOWN)
    v(17, 7),    // W5: lid bottom-right (open)
  ];
  const lidIn = [
    [0, 0],
    [0, 0],
    [-t, 0],
    [0, 0],
    [0, -t],
    [0, 0],
  ];
  const lidOut = [
    [0, 0],
    [0, -t],
    [0, 0],
    [t, 0],
    [0, 0],
    [0, 0],
  ];

  const lid = shapeLayer({
    name: "Lid", ind: 3,
    scale: breath({}),
    shapes: [
      group([
        pathShape({ vertices: lidVerts, inTans: lidIn, outTans: lidOut, closed: false }),
        stroke({ width: STROKE_W }),
        trim({ enterFrame: 50, duration: 36 }),
        transform(),
      ]),
    ],
  });

  // Content lines — three horizontal entries inside the body that
  // trim-draw on after the case is fully assembled. Decreasing length
  // (L→R) reads as a list of portfolio works. Lighter stroke (12px)
  // than the case outline (18px) creates visual hierarchy so the
  // case stays the dominant mark and the content reads as detail.
  function entryLine({ ind, svgY, leftX, rightX, drawFrame }) {
    return shapeLayer({
      name: `Entry${ind}`, ind,
      scale: breath({}),
      shapes: [
        group([
          pathShape({
            vertices: [v(leftX, svgY), v(rightX, svgY)],
            closed: false,
          }),
          stroke({ width: 12 }),
          trim({ enterFrame: drawFrame, duration: 22 }),
          transform(),
        ]),
      ],
    });
  }

  // Three lines spanning the body interior (body: y=11→21, x=3→21).
  // Lines sit at y=14, 16.5, 19 with progressively shorter widths.
  const entry1 = entryLine({ ind: 4, svgY: 14, leftX: 6, rightX: 18, drawFrame: 78 });
  const entry2 = entryLine({ ind: 5, svgY: 16.5, leftX: 6, rightX: 16, drawFrame: 86 });
  const entry3 = entryLine({ ind: 6, svgY: 19, leftX: 6, rightX: 14, drawFrame: 94 });

  return {
    v: "5.7.0", fr: 60, ip: 0, op: 150, w: 720, h: 720,
    nm: "portfolio-intro", ddd: 0, assets: [],
    layers: [entry3, entry2, entry1, lid, shoulders, body, backgroundLayer(99)]
      .map((l, i) => ({ ...l, ind: i + 1 })),
  };
}

// ---------- write outputs ----------

const outputs = {
  "projects-intro.json": buildProjects(),
  "inbox-intro.json": buildInbox(),
  "earnings-intro.json": buildEarnings(),
  "jobs-intro.json": buildJobs(),
  "portfolio-intro.json": buildPortfolio(),
};

for (const [filename, data] of Object.entries(outputs)) {
  const out = resolve(OUT_DIR, filename);
  writeFileSync(out, JSON.stringify(data));
  console.log(`wrote ${out} (${JSON.stringify(data).length} bytes)`);
}
