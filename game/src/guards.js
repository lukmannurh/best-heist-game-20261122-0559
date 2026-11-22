// Guard + camera AI. Pure updates over plain state, no DOM.
// Guard states: patrol -> suspicious (investigate last seen) -> alert (chase).
// Cameras sweep and feed the alarm directly; they never catch the player.
import { DETECTION, ALARM, PLAYER } from './config.js';
import { angleDiff, angleTo, clamp, dist } from './random.js';
import { losBlocked, smokeBlocks, inShadow, resolveCircle, WALLS } from './world.js';

function canSee(gx, gy, dir, range, halfAngle, px, py, smokes) {
  const d = dist(gx, gy, px, py);
  if (d > range) return { seen: false, d };
  if (Math.abs(angleDiff(dir, angleTo(gx, gy, px, py))) > halfAngle) return { seen: false, d };
  if (losBlocked(gx, gy, px, py, WALLS)) return { seen: false, d };
  if (smokeBlocks(gx, gy, px, py, smokes)) return { seen: false, d };
  return { seen: true, d };
}

// One guard step. `s` is the shared game state (player, alarm, smokes, events).
export function updateGuard(g, s, dt) {
  const p = s.player;
  const speedMul = s.alarm >= ALARM.lockdownAt ? ALARM.lockdownSpeedMul : 1;
  const chaseMul = ALARM.chaseSpeedMul;

  // --- vision ---
  let stanceMul = 1;
  if (p.sneaking) stanceMul *= DETECTION.sneakMul;
  if (p.sprinting) stanceMul *= DETECTION.sprintMul;
  if (inShadow(p.x, p.y)) stanceMul *= DETECTION.shadowMul;
  const vis = canSee(g.x, g.y, g.dir, DETECTION.guardRange, DETECTION.guardHalfAngle, p.x, p.y, s.smokes);
  if (vis.seen && !p.invulnT) {
    const prox = 1 - vis.d / DETECTION.guardRange; // 0 far .. 1 point-blank
    const rate = (DETECTION.rateFar + (DETECTION.rateClose - DETECTION.rateFar) * prox) * stanceMul;
    g.suspicion = clamp(g.suspicion + rate * dt, 0, 1);
    g.lastSeen = { x: p.x, y: p.y, t: s.time };
    if (g.suspicion >= DETECTION.alertAt && g.state !== 'alert') {
      g.state = 'alert';
      s.events.push({ type: 'spotted', by: g.name, t: s.time });
    } else if (g.suspicion >= DETECTION.suspiciousAt && g.state === 'patrol') {
      g.state = 'suspicious';
      s.events.push({ type: 'suspicious', by: g.name, t: s.time });
    }
  } else {
    g.suspicion = clamp(g.suspicion - DETECTION.decay * dt, 0, 1);
    if (g.state === 'suspicious' && g.suspicion < 0.12) {
      g.state = 'patrol';
      g.lastSeen = null;
    }
    if (g.state === 'alert' && g.suspicion <= 0 && s.alarm < ALARM.lockdownAt) {
      g.state = 'suspicious';
    }
  }

  // --- hearing: sprint noise pulls a patrolling guard to investigate ---
  if (p.sprinting && g.state === 'patrol') {
    const d = dist(g.x, g.y, p.x, p.y);
    if (d < PLAYER.noiseSprint && !losBlocked(g.x, g.y, p.x, p.y, WALLS)) {
      g.state = 'suspicious';
      g.lastSeen = { x: p.x, y: p.y, t: s.time };
      s.events.push({ type: 'heard', by: g.name, t: s.time });
    }
  }

  // --- movement ---
  if (g.state === 'patrol') {
    const target = g.waypoints[g.wp];
    stepToward(g, target[0], target[1], g.speed * speedMul, dt);
    if (dist(g.x, g.y, target[0], target[1]) < 8) {
      g.wp = (g.wp + 1) % g.waypoints.length;
      g.pauseT = 0.9; // glance around at each corner
    }
    if (g.pauseT > 0) {
      g.pauseT -= dt;
      g.dir += Math.sin(s.time * 1.7 + g.waypoints.length) * 0.9 * dt;
    }
  } else if (g.state === 'suspicious' && g.lastSeen) {
    stepToward(g, g.lastSeen.x, g.lastSeen.y, g.speed * 1.25 * speedMul, dt);
    if (dist(g.x, g.y, g.lastSeen.x, g.lastSeen.y) < 14) {
      g.pauseT += dt;
      g.dir += 1.4 * dt; // scan the room
      if (g.pauseT > 2.4) {
        g.pauseT = 0;
        g.state = 'patrol';
        g.lastSeen = null;
      }
    }
  } else if (g.state === 'alert') {
    // Chase the player, re-pathing straight at them (open floor plan).
    stepToward(g, p.x, p.y, g.speed * chaseMul * speedMul, dt);
    if (dist(g.x, g.y, p.x, p.y) < 26 && !p.invulnT) {
      s.events.push({ type: 'caught', by: g.name, t: s.time });
    }
    if (g.suspicion <= 0 && s.alarm < 30) {
      g.state = 'patrol';
      g.lastSeen = null;
    }
  }
}

function stepToward(g, tx, ty, speed, dt) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 1) return;
  const want = angleTo(g.x, g.y, tx, ty);
  // Close in: face the target directly so the waypoint is always reached
  // (a limited turn rate would orbit a point inside the turning circle).
  if (d < 30) g.dir = want;
  else g.dir += clamp(angleDiff(g.dir, want), -3.2 * dt, 3.2 * dt);
  // Walk. If a wall blocks the way, try sidesteps before giving up.
  const ox = g.x;
  const oy = g.y;
  const expected = speed * dt;
  for (const off of [0, 0.6, -0.6, 1.1, -1.1]) {
    g.x = ox + Math.cos(g.dir + off) * expected;
    g.y = oy + Math.sin(g.dir + off) * expected;
    resolveCircle(g, 12, WALLS);
    if (dist(ox, oy, g.x, g.y) >= expected * 0.5) return;
    g.x = ox;
    g.y = oy;
  }
}

// One camera step. Returns nothing; sets cam.spotting + cam.dir.
export function updateCamera(cam, s, dt) {
  const speedMul = s.alarm >= ALARM.lockdownAt ? 1.6 : 1;
  cam.dir = cam.base + Math.sin(s.time * cam.speed * speedMul + cam.phase) * cam.sweep;
  if (s.camerasOffT > 0) {
    cam.spotting = false;
    return;
  }
  const p = s.player;
  const vis = canSee(cam.x, cam.y, cam.dir, DETECTION.cameraRange, DETECTION.cameraHalfAngle, p.x, p.y, s.smokes);
  const was = cam.spotting;
  cam.spotting = vis.seen && !p.invulnT;
  if (cam.spotting && !was) {
    s.events.push({ type: 'camera-spot', by: cam.id, t: s.time });
  }
}

// Alarm meter step: rises while spotted, decays while hidden.
export function updateAlarm(s, dt) {
  let rise = 0;
  for (const g of s.guards) {
    if (g.suspicion > 0.6) rise = Math.max(rise, ALARM.guardSpotRate);
  }
  for (const c of s.cameras) {
    if (c.spotting) rise = Math.max(rise, ALARM.cameraSpotRate);
  }
  if (rise > 0) {
    s.alarm = clamp(s.alarm + rise * dt, 0, 100);
    if (s.alarm >= ALARM.lockdownAt && !s.lockdown) {
      s.lockdown = true;
      s.events.push({ type: 'lockdown', t: s.time });
    }
  } else {
    s.alarm = clamp(s.alarm - ALARM.decay * dt, 0, 100);
    if (s.alarm < ALARM.lockdownAt - 10) s.lockdown = false;
  }
}
