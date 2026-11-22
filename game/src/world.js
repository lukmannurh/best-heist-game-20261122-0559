// World: floor plan, walls, loot, guards, cameras, geometry. Pure, no DOM.
// Canvas 1280x800. HUD strip y 0-48. Building y 60-740. Street y 740-800.
import { clamp, dist } from './random.js';

// Walls as solid rects {x,y,w,h}. Doors are gaps between segments.
export const WALLS = [
  // Outer shell (bottom has the exit gap x 120-200).
  { x: 20, y: 60, w: 1240, h: 12 }, // top
  { x: 20, y: 60, w: 12, h: 680 }, // left
  { x: 1248, y: 60, w: 12, h: 680 }, // right
  { x: 20, y: 728, w: 100, h: 12 }, // bottom, left of exit
  { x: 200, y: 728, w: 1060, h: 12 }, // bottom, right of exit
  // West divider x=320, door gap y 340-420.
  { x: 320, y: 60, w: 12, h: 280 },
  { x: 320, y: 420, w: 12, h: 320 },
  // East divider x=960, door gap y 240-320.
  { x: 960, y: 60, w: 12, h: 180 },
  { x: 960, y: 320, w: 12, h: 420 },
  // West wing split y=340, door gap x 150-210 (office above, gem gallery below).
  { x: 20, y: 340, w: 130, h: 12 },
  { x: 210, y: 340, w: 110, h: 12 },
  // Lobby split y=560, door gap x 240-300 (lobby below is safe at spawn:
  // the gap sits away from Rosa's patrol so she cannot see the spawn).
  { x: 20, y: 560, w: 220, h: 12 },
  { x: 300, y: 560, w: 20, h: 12 },
  // Vault room split y=340, door gap x 1080-1140.
  { x: 960, y: 340, w: 120, h: 12 },
  { x: 1140, y: 340, w: 120, h: 12 },
  // Gallery south wall y=500, door gaps x 560-640 and x 800-880.
  { x: 320, y: 500, w: 240, h: 12 },
  { x: 640, y: 500, w: 160, h: 12 },
  { x: 880, y: 500, w: 80, h: 12 },
  // Pillars in the gallery.
  { x: 540, y: 180, w: 30, h: 30 },
  { x: 740, y: 180, w: 30, h: 30 },
  { x: 540, y: 380, w: 30, h: 30 },
  { x: 740, y: 380, w: 30, h: 30 },
  // Crates (cover) in the south corridor + gallery.
  { x: 400, y: 560, w: 64, h: 44 },
  { x: 880, y: 560, w: 64, h: 44 },
  { x: 620, y: 260, w: 60, h: 36 },
];

// Dark floor patches: standing here halves detection gain.
export const SHADOWS = [
  { x: 380, y: 540, w: 120, h: 90, label: 'shadow' },
  { x: 860, y: 540, w: 120, h: 90, label: 'shadow' },
  { x: 1080, y: 420, w: 140, h: 90, label: 'shadow' },
  { x: 60, y: 560, w: 120, h: 90, label: 'shadow' },
];

export const VAN = { x: 80, y: 748, w: 150, h: 44 };
export const EXIT_DOOR = { x: 120, y: 728, w: 80, h: 12 };
export const PLAYER_START = { x: 160, y: 690 };

// Loot: id, kind, x, y, value, label. Paintings hang on the north wall,
// gem cases stand in the west gem gallery, the vault sits top-right.
export function makeLoot() {
  return [
    { id: 'paint-a', kind: 'painting', x: 470, y: 82, value: 800, label: 'Sunset over Meridian', taken: false },
    { id: 'paint-b', kind: 'painting', x: 820, y: 82, value: 800, label: 'The Duchess in Blue', taken: false },
    { id: 'gem-a', kind: 'gem', x: 110, y: 480, value: 1200, label: 'Star Sapphire', taken: false },
    { id: 'gem-b', kind: 'gem', x: 250, y: 480, value: 1200, label: 'Emerald of Cairo', taken: false },
    { id: 'vault', kind: 'vault', x: 1170, y: 110, value: 5000, label: 'Meridian Vault', taken: false, locked: true },
  ];
}

// Keycard in the security office: grab it and the cameras go dark for 20 s.
export const KEYCARD = { x: 120, y: 180, r: 14, taken: false };

export function makeGuards() {
  return [
    {
      id: 'g1', name: 'Marco', x: 400, y: 150, dir: 0, speed: 62,
      waypoints: [[400, 150], [880, 150], [880, 440], [400, 440]],
      wp: 1, state: 'patrol', suspicion: 0, lastSeen: null, pauseT: 0, stuckT: 0,
    },
    {
      id: 'g2', name: 'Rosa', x: 100, y: 120, dir: Math.PI / 2, speed: 58,
      waypoints: [[180, 120], [250, 120], [250, 300], [180, 300], [180, 520], [100, 520], [100, 420], [180, 420]],
      wp: 1, state: 'patrol', suspicion: 0, lastSeen: null, pauseT: 0, stuckT: 0,
    },
    {
      id: 'g3', name: 'Viktor', x: 1030, y: 120, dir: 0, speed: 60,
      waypoints: [[1110, 120], [1180, 200], [1110, 300], [1110, 620], [1030, 620], [1030, 400], [1110, 400]],
      wp: 1, state: 'patrol', suspicion: 0, lastSeen: null, pauseT: 0, stuckT: 0,
    },
    {
      id: 'g4', name: 'Dana', x: 380, y: 620, dir: 0, speed: 64,
      waypoints: [[380, 620], [900, 620], [850, 440], [450, 440], [600, 440], [600, 620]],
      wp: 1, state: 'patrol', suspicion: 0, lastSeen: null, pauseT: 0, stuckT: 0,
    },
  ];
}

export function makeCameras() {
  return [
    { id: 'c1', x: 640, y: 74, base: Math.PI / 2, sweep: 0.96, phase: 0, speed: 0.55, spotting: false },
    { id: 'c2', x: 1110, y: 74, base: Math.PI / 2, sweep: 0.85, phase: 1.7, speed: 0.7, spotting: false },
  ];
}

// ---- geometry ----

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return dist(cx, cy, nx, ny) < r;
}

// Push a circle out of all walls it overlaps. Returns true if it hit anything.
export function resolveCircle(pos, r, walls) {
  let hit = false;
  for (const w of walls) {
    if (!circleHitsRect(pos.x, pos.y, r, w)) continue;
    hit = true;
    const nx = clamp(pos.x, w.x, w.x + w.w);
    const ny = clamp(pos.y, w.y, w.y + w.h);
    let dx = pos.x - nx;
    let dy = pos.y - ny;
    let d = Math.hypot(dx, dy);
    if (d === 0) {
      // Centre inside the rect: push out along the smallest penetration axis.
      const left = pos.x - w.x;
      const right = w.x + w.w - pos.x;
      const top = pos.y - w.y;
      const bottom = w.y + w.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = w.x - r;
      else if (m === right) pos.x = w.x + w.w + r;
      else if (m === top) pos.y = w.y - r;
      else pos.y = w.y + w.h + r;
      continue;
    }
    dx /= d;
    dy /= d;
    pos.x = nx + dx * r;
    pos.y = ny + dy * r;
  }
  return hit;
}

function segHitsRect(x1, y1, x2, y2, r) {
  // Segment vs rect: sample-free slab test.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// True when a wall blocks the line of sight between two points.
export function losBlocked(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

// True when the segment crosses any smoke cloud.
export function smokeBlocks(x1, y1, x2, y2, smokes) {
  for (const s of smokes) {
    if (s.t <= 0) continue;
    // Segment-circle test.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((s.x - x1) * dx + (s.y - y1) * dy) / len2;
    t = clamp(t, 0, 1);
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    if (dist(px, py, s.x, s.y) < s.r) return true;
  }
  return false;
}

export function inShadow(x, y) {
  for (const s of SHADOWS) {
    if (pointInRect(x, y, s)) return true;
  }
  return false;
}

export function inVan(x, y) {
  return pointInRect(x, y, VAN);
}
