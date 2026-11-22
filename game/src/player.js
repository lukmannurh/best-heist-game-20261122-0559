// Player: movement, stance, tools, loot, vault channel. Pure-ish update;
// the DOM layer feeds it an input snapshot {mx, my, sneak, sprint, ...}.
import { PLAYER, TOOLS, LOOT_TARGET_WIN, DETECTION } from './config.js';
import { clamp, dist } from './random.js';
import {
  resolveCircle, WALLS, VAN, PLAYER_START, inVan, pointInRect,
} from './world.js';

export function makePlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    dir: -Math.PI / 2,
    sneaking: false,
    sprinting: false,
    moving: false,
    loot: 0,
    lootItems: [],
    lives: 3,
    smokes: TOOLS.smokeCount,
    invulnT: 0,
    vaultT: 0, // lockpick channel progress, seconds
    channeling: false,
    stepT: 0,
  };
}

// Nearest loot / keycard within grab range, or null.
export function nearestGrab(s) {
  const p = s.player;
  for (const item of s.loot) {
    if (item.taken) continue;
    const reach = item.kind === 'vault' ? 52 : 34;
    if (dist(p.x, p.y, item.x, item.y) < reach) return { kind: 'loot', item };
  }
  if (!s.keycard.taken && dist(p.x, p.y, s.keycard.x, s.keycard.y) < 34) {
    return { kind: 'keycard' };
  }
  return null;
}

export function updatePlayer(s, input, dt) {
  const p = s.player;
  p.invulnT = Math.max(0, p.invulnT - dt);

  // Movement: WASD/arrows, or click-to-move target.
  let mx = 0;
  let my = 0;
  if (input.mx !== 0 || input.my !== 0) {
    mx = input.mx;
    my = input.my;
  } else if (input.click) {
    const d = dist(p.x, p.y, input.click.x, input.click.y);
    if (d > 10) {
      mx = (input.click.x - p.x) / d;
      my = (input.click.y - p.y) / d;
    }
  }
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
  }
  p.sneaking = !!input.sneak && len > 0;
  p.sprinting = !!input.sprint && !p.sneaking && len > 0;
  p.moving = len > 0;

  // Channeling the vault freezes the player.
  const speed = p.channeling
    ? 0
    : p.sneaking
      ? PLAYER.sneak
      : p.sprinting
        ? PLAYER.sprint
        : PLAYER.walk;
  if (len > 0 && speed > 0) {
    p.dir = Math.atan2(my, mx);
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
    resolveCircle(p, PLAYER.r, WALLS);
    // Footstep ticks for the audio layer.
    p.stepT -= dt * (p.sprinting ? 1.6 : p.sneaking ? 0.7 : 1);
    if (p.stepT <= 0) {
      p.stepT = 0.34;
      s.events.push({ type: 'step', loud: p.sprinting, t: s.time });
    }
  }

  // Keep the player inside the canvas (street included).
  p.x = clamp(p.x, 28, 1252);
  p.y = clamp(p.y, 68, 792);

  // --- smoke bomb ---
  if (input.smoke && p.smokes > 0 && s.smokeCooldown <= 0) {
    p.smokes -= 1;
    s.smokes.push({ x: p.x, y: p.y, r: TOOLS.smokeRadius, t: TOOLS.smokeSecs });
    s.smokeCooldown = 0.5;
    s.events.push({ type: 'smoke', t: s.time });
  }
  s.smokeCooldown = Math.max(0, (s.smokeCooldown || 0) - dt);
  for (const sm of s.smokes) sm.t -= dt;
  s.smokes = s.smokes.filter((sm) => sm.t > 0);

  // --- grab loot / keycard ---
  const grab = nearestGrab(s);
  s.grabTarget = grab;
  if (input.grab && grab) {
    if (grab.kind === 'keycard') {
      s.keycard.taken = true;
      s.camerasOffT = TOOLS.keycardCameraOffSecs;
      s.events.push({ type: 'keycard', t: s.time });
    } else if (grab.item.kind === 'vault') {
      // Vault needs a channel, handled below; a tap starts it.
      p.channeling = true;
    } else {
      grab.item.taken = true;
      p.loot += grab.item.value;
      p.lootItems.push(grab.item.id);
      s.events.push({ type: 'loot', label: grab.item.label, value: grab.item.value, t: s.time });
    }
  }

  // --- vault lockpick channel ---
  const vault = s.loot.find((l) => l.kind === 'vault');
  const nearVault = vault && !vault.taken && dist(p.x, p.y, vault.x, vault.y) < 52;
  if (p.channeling) {
    if (!nearVault || len > 0 || !input.grabHeld) {
      p.channeling = false;
      p.vaultT = 0;
    } else {
      p.vaultT += dt;
      if (p.vaultT >= TOOLS.vaultChannelSecs) {
        vault.taken = true;
        vault.locked = false;
        p.loot += vault.value;
        p.lootItems.push(vault.id);
        p.channeling = false;
        p.vaultT = 0;
        s.alarm = clamp(s.alarm + 15, 0, 100);
        s.events.push({ type: 'vault', value: vault.value, t: s.time });
      }
    }
  }

  // --- cameras off timer ---
  s.camerasOffT = Math.max(0, s.camerasOffT - dt);

  // --- win: reach the van with enough loot ---
  if (inVan(p.x, p.y) && p.loot >= LOOT_TARGET_WIN && s.phase === 'play') {
    s.events.push({ type: 'win', loot: p.loot, time: s.time, t: s.time });
  }
}

// Caught: lose a life, drop the last loot item, respawn at the lobby door.
export function applyCaught(s, byName) {
  const p = s.player;
  p.lives -= 1;
  const dropped = p.lootItems.pop();
  if (dropped) {
    const item = s.loot.find((l) => l.id === dropped);
    if (item) {
      item.taken = false;
      if (item.kind === 'vault') item.locked = true;
      p.loot -= item.value;
    }
  }
  p.x = PLAYER_START.x;
  p.y = PLAYER_START.y;
  p.dir = -Math.PI / 2;
  p.channeling = false;
  p.vaultT = 0;
  p.invulnT = 2.5;
  s.alarm = 35;
  for (const g of s.guards) {
    g.suspicion = 0;
    g.state = 'patrol';
    g.lastSeen = null;
  }
  s.events.push({ type: 'respawn', by: byName, lives: p.lives, dropped: dropped || null, t: s.time });
}
