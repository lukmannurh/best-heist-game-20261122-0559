// All canvas drawing. One frame shows the whole heist: rooms, guards with
// vision cones, cameras, loot, alarm meter, getaway van. No DOM besides canvas.
import { COLORS, VIEW, HUD_H, DETECTION, TOOLS, LOOT_TARGET_WIN } from './config.js';
import { fmtMoney, fmtTime, clamp } from './random.js';
import { WALLS, SHADOWS, VAN, EXIT_DOOR, inShadow } from './world.js';

// Ray vs wall rects: distance along the ray to the nearest wall, or maxDist.
function castRay(x, y, ang, maxDist) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let best = maxDist;
  for (const w of WALLS) {
    let tmin = 0;
    let tmax = best;
    let ok = true;
    if (dx === 0) {
      if (x < w.x || x > w.x + w.w) ok = false;
    } else {
      let t1 = (w.x - x) / dx;
      let t2 = (w.x + w.w - x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) ok = false;
    }
    if (ok) {
      if (dy === 0) {
        if (y < w.y || y > w.y + w.h) ok = false;
      } else {
        let t1 = (w.y - y) / dy;
        let t2 = (w.y + w.h - y) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) ok = false;
      }
    }
    if (ok && tmin < best && tmin >= 0) best = tmin;
  }
  return best;
}

// Vision cone polygon, clipped by walls.
function conePath(ctx, x, y, dir, range, half) {
  const N = 22;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= N; i++) {
    const a = dir - half + (2 * half * i) / N;
    const d = castRay(x, y, a, range);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawFloor(ctx, s) {
  // Base floor + checker tiles inside the building.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(20, 60, 1240, 680);
  ctx.fillStyle = COLORS.floorTile;
  for (let ty = 60; ty < 740; ty += 40) {
    for (let tx = 20; tx < 1260; tx += 40) {
      if (((tx + ty) / 40) % 2 === 0) ctx.fillRect(tx + 1, ty + 1, 38, 38);
    }
  }
  // Room labels, faint.
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECURITY OFFICE', 170, 120);
  ctx.fillText('GEM GALLERY', 170, 540);
  ctx.fillText('MAIN GALLERY', 640, 330);
  ctx.fillText('THE VAULT', 1110, 200);
  ctx.fillText('SOUTH CORRIDOR', 640, 700);
  ctx.fillText('LOBBY', 170, 660);
  // Shadow zones (dark floor = safer).
  for (const sh of SHADOWS) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(sh.x, sh.y, sh.w, sh.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(sh.x + 0.5, sh.y + 0.5, sh.w, sh.h);
  }
  // Street + road markings + getaway van.
  ctx.fillStyle = '#14161d';
  ctx.fillRect(0, 740, 1280, 60);
  ctx.fillStyle = '#c9a227';
  for (let x = 20; x < 1280; x += 60) ctx.fillRect(x, 776, 34, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MERIDIAN STREET — GETAWAY', 300, 772);
  // Van.
  ctx.fillStyle = COLORS.van;
  roundRect(ctx, VAN.x, VAN.y, VAN.w, VAN.h, 8);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(VAN.x + 104, VAN.y + 8, 36, 18);
  ctx.fillStyle = '#fff';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', VAN.x + 58, VAN.y + 22);
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(VAN.x + 30, VAN.y + VAN.h, 9, 0, Math.PI * 2);
  ctx.arc(VAN.x + 120, VAN.y + VAN.h, 9, 0, Math.PI * 2);
  ctx.fill();
  // Exit door marker.
  ctx.fillStyle = '#58d68d';
  ctx.fillRect(EXIT_DOOR.x, EXIT_DOOR.y - 4, EXIT_DOOR.w, 4);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWalls(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 3);
  }
}

function drawLoot(ctx, s) {
  for (const item of s.loot) {
    if (item.taken) continue;
    const bob = Math.sin(s.time * 2.4 + item.x) * 2;
    if (item.kind === 'painting') {
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(item.x - 26, item.y - 16 + bob, 52, 36);
      ctx.fillStyle = '#3d6b8e';
      ctx.fillRect(item.x - 21, item.y - 11 + bob, 42, 26);
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.arc(item.x - 8, item.y - 2 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e8e8';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtMoney(item.value), item.x, item.y + 32 + bob);
    } else if (item.kind === 'gem') {
      ctx.fillStyle = 'rgba(120,200,255,0.25)';
      ctx.fillRect(item.x - 20, item.y - 16 + bob, 40, 32);
      ctx.strokeStyle = '#9fb4c8';
      ctx.strokeRect(item.x - 20, item.y - 16 + bob, 40, 32);
      ctx.fillStyle = '#7fe7ff';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 10 + bob);
      ctx.lineTo(item.x + 9, item.y + bob);
      ctx.lineTo(item.x, item.y + 10 + bob);
      ctx.lineTo(item.x - 9, item.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtMoney(item.value), item.x, item.y + 30 + bob);
    } else if (item.kind === 'vault') {
      ctx.fillStyle = '#3a3f4a';
      roundRect(ctx, item.x - 46, item.y - 40, 92, 80, 8);
      ctx.fill();
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#22262e';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VAULT', item.x, item.y + 56);
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = '#f5c542';
      ctx.fillText(fmtMoney(item.value) + ' — hold E', item.x, item.y + 72);
    }
  }
  // Keycard in the security office.
  if (!s.keycard.taken) {
    const k = s.keycard;
    const bob = Math.sin(s.time * 3) * 2;
    ctx.fillStyle = '#2ecc71';
    roundRect(ctx, k.x - 12, k.y - 8 + bob, 24, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEY', k.x, k.y + 3 + bob);
    ctx.fillStyle = '#2ecc71';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillText('KEYCARD — cameras off 20s', k.x, k.y + 24 + bob);
  }
}

function drawCameras(ctx, s) {
  for (const cam of s.cameras) {
    const off = s.camerasOffT > 0;
    if (!off) {
      conePath(ctx, cam.x, cam.y, cam.dir, DETECTION.cameraRange, DETECTION.cameraHalfAngle);
      ctx.fillStyle = cam.spotting ? 'rgba(255,60,60,0.45)' : 'rgba(255,90,90,0.30)';
      ctx.fill();
      // Thin red edge so the sweep reads even on dark floor.
      ctx.strokeStyle = 'rgba(255,90,90,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // Wall mount + lens + label, big enough to spot at a glance.
    ctx.fillStyle = '#22262e';
    ctx.fillRect(cam.x - 13, cam.y - 7, 26, 14);
    ctx.strokeStyle = '#9fb4c8';
    ctx.strokeRect(cam.x - 13, cam.y - 7, 26, 14);
    ctx.fillStyle = off ? '#555' : cam.spotting ? '#ff3c3c' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.dir) * 15, cam.y + Math.sin(cam.dir) * 15, 6, 0, Math.PI * 2);
    ctx.fill();
    if (off) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAM OFF ' + Math.ceil(s.camerasOffT) + 's', cam.x, cam.y + 28);
    }
  }
}

function drawGuards(ctx, s) {
  for (const g of s.guards) {
    const alert = g.state === 'alert';
    conePath(ctx, g.x, g.y, g.dir, DETECTION.guardRange, DETECTION.guardHalfAngle);
    ctx.fillStyle = alert ? COLORS.coneAlert : g.state === 'suspicious' ? 'rgba(255,176,46,0.24)' : COLORS.cone;
    ctx.fill();
    // Body.
    ctx.fillStyle = alert ? '#c0392b' : g.state === 'suspicious' ? '#b7791f' : '#2c4a6e';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfe6f2';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    // Facing tick + cap.
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * 18, g.y + Math.sin(g.dir) * 18);
    ctx.stroke();
    ctx.fillStyle = '#dfe6f2';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y - 20);
    // Suspicion arc + mark.
    if (g.suspicion > 0.05) {
      ctx.strokeStyle = alert ? '#ff4d4d' : '#ffb02e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (alert) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText('!', g.x, g.y - 32);
    } else if (g.state === 'suspicious') {
      ctx.fillStyle = '#ffb02e';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText('?', g.x, g.y - 32);
    }
  }
}

function drawSmoke(ctx, s) {
  for (const sm of s.smokes) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMOKE ' + Math.ceil(sm.t) + 's', sm.x, sm.y - sm.r - 6);
  }
}

function drawPlayer(ctx, s) {
  const p = s.player;
  const blink = p.invulnT > 0 && Math.floor(s.time * 8) % 2 === 0;
  if (!blink) {
    // Noise ring while sprinting.
    if (p.sprinting && p.moving) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 135, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Body: hooded thief, dark coat + gold mask stripe.
    ctx.fillStyle = p.sneaking ? '#1f2a1f' : '#22262e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.dir) * 6, p.y + Math.sin(p.dir) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', p.x, p.y - 20);
  }
  // Lockpick progress ring.
  if (p.channeling) {
    const frac = p.vaultT / TOOLS.vaultChannelSecs;
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f5c542';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PICKING… ' + Math.ceil((1 - frac) * TOOLS.vaultChannelSecs) + 's', p.x - 30, p.y + 4);
    ctx.textAlign = 'center';
  }
  // Grab prompt.
  if (s.grabTarget && s.phase === 'play' && !p.channeling) {
    const g = s.grabTarget;
    const label = g.kind === 'keycard'
      ? 'E — take KEYCARD'
      : g.item.kind === 'vault'
        ? 'Hold E — pick the VAULT'
        : 'E — steal ' + g.item.label + ' (' + fmtMoney(g.item.value) + ')';
    ctx.fillStyle = 'rgba(8,10,16,0.85)';
    const w = ctx.measureText(label).width + 24;
    roundRect(ctx, p.x - w / 2, p.y - 52, w, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, p.y - 35);
  }
}

function drawHUD(ctx, s) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW.w, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 1, VIEW.w, 1);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5c542';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText('VAULTBREAK', 16, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('THE MERIDIAN JOB', 16, 44);

  // Loot.
  const p = s.player;
  ctx.fillStyle = '#fff';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('LOOT ' + fmtMoney(p.loot), 210, 26);
  ctx.fillStyle = p.loot >= LOOT_TARGET_WIN ? COLORS.ok : 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('target ' + fmtMoney(LOOT_TARGET_WIN) + ' for the van', 210, 42);

  // Alarm meter.
  const ax = 470;
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('ALARM', ax, 20);
  const frac = clamp(s.alarm / 100, 0, 1);
  ctx.fillStyle = '#2a3040';
  roundRect(ctx, ax + 62, 8, 240, 16, 8);
  ctx.fill();
  const col = frac < 0.35 ? COLORS.ok : frac < 0.7 ? COLORS.alarmMid : COLORS.alarm;
  if (frac > 0.01) {
    ctx.fillStyle = col;
    roundRect(ctx, ax + 62, 8, Math.max(16, 240 * frac), 16, 8);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText(Math.round(s.alarm) + '%', ax + 312, 20);
  if (s.lockdown) {
    const flash = Math.floor(s.time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff4d4d' : '#ffb02e';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('LOCKDOWN', ax + 62, 40);
  } else if (s.camerasOffT > 0) {
    ctx.fillStyle = '#2ecc71';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('cameras dark ' + Math.ceil(s.camerasOffT) + 's', ax + 62, 40);
  }

  // Lives, timer, smoke.
  const rx = 900;
  ctx.fillStyle = '#fff';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('♥'.repeat(Math.max(0, p.lives)) + '♡'.repeat(Math.max(0, 3 - p.lives)), rx, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(fmtTime(s.time), rx, 43);
  ctx.fillStyle = '#fff';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('SMOKE ×' + p.smokes + '  [Q]', 1030, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(p.sneaking ? 'SNEAKING — slow, quiet' : p.sprinting ? 'SPRINTING — loud!' : 'WASD move · Shift sneak · Space sprint', 1030, 43);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5,7,12,0.78)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#f5c542';
  ctx.font = '700 54px system-ui, sans-serif';
  ctx.fillText(title, VIEW.w / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '400 19px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW.w / 2, 350 + i * 30));
}

export function render(ctx, s) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  drawFloor(ctx, s);
  drawLoot(ctx, s);
  drawCameras(ctx, s);
  drawGuards(ctx, s);
  drawSmoke(ctx, s);
  drawWalls(ctx);
  drawPlayer(ctx, s);
  drawHUD(ctx, s);

  if (s.phase === 'title') {
    overlay(ctx, 'VAULTBREAK', [
      'One night. One museum. Five million in the vault.',
      'Steal at least ' + fmtMoney(LOOT_TARGET_WIN) + ', then reach the red getaway van.',
      'Dodge the guards’ cones and the cameras. Shift sneaks, Space sprints (loud).',
      'Q drops a smoke bomb. E steals. Hold E to pick the vault.',
      'Press SPACE or click to start.',
    ]);
  } else if (s.phase === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P to keep stealing.']);
  } else if (s.phase === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      s.caughtBy + ' grabbed you.',
      s.player.lives > 0
        ? 'You slip away and wake up at the lobby door — one life down, last loot dropped.'
        : 'The crew is done for tonight.',
      s.player.lives > 0 ? 'Press SPACE to go again.' : 'Press SPACE to retry the job.',
    ], '#ff4d4d');
  } else if (s.phase === 'won') {
    const rating = s.maxAlarm < 35 ? 'GHOST — never really seen' : s.maxAlarm < 70 ? 'CLEAN — a few close calls' : 'LOUD — the whole city heard it';
    overlay(ctx, 'CLEAN GETAWAY!', [
      'Loot: ' + fmtMoney(s.player.loot) + '  ·  Time: ' + fmtTime(s.time) + '  ·  Lives left: ' + s.player.lives,
      rating,
      'Best time: ' + fmtTime(s.bestTime) + '  ·  Press SPACE to run it again.',
    ], COLORS.ok);
  } else if (s.phase === 'lost') {
    overlay(ctx, 'BUSTED', [
      'Three strikes. The Meridian keeps its gold — tonight.',
      'Loot kept: ' + fmtMoney(s.player.loot) + '  ·  Press SPACE to retry.',
    ], '#ff4d4d');
  }
}
