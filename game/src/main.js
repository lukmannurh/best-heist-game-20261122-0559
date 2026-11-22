// VAULTBREAK — The Meridian Job. Game loop, phases, events, wiring.
// Phases: title -> play -> (caught | won | lost), P pauses, SPACE restarts.
import { VIEW } from './config.js';
import { hashSeed, mulberry32 } from './random.js';
import { makeLoot, makeGuards, makeCameras, KEYCARD } from './world.js';
import { makePlayer, updatePlayer, applyCaught } from './player.js';
import { updateGuard, updateCamera, updateAlarm } from './guards.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { sfx, setAlarm } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const seed = hashSeed(params.get('seed') || 'meridian');
const rng = mulberry32(seed);

function freshState() {
  return {
    phase: 'title',
    time: 0,
    maxAlarm: 0,
    alarm: 0,
    lockdown: false,
    camerasOffT: 0,
    smokeCooldown: 0,
    smokes: [],
    loot: makeLoot(),
    guards: makeGuards(),
    cameras: makeCameras(),
    keycard: { ...KEYCARD },
    player: makePlayer(),
    grabTarget: null,
    caughtBy: '',
    events: [],
    bestTime: Number(localStorage.getItem('vaultbreak-best') || 0) || 0,
    muted: false,
  };
}

let s = freshState();
const shot = params.get('shot');
if (shot) applyShot(s, shot);

const input = createInput(canvas);
let last = performance.now();
let alarmOn = false;

function setPhase(next) {
  s.phase = next;
  statusEl.textContent = 'VAULTBREAK — phase: ' + next;
}

function restart() {
  const best = s.bestTime;
  s = freshState();
  s.bestTime = best;
  if (shot) applyShot(s, shot);
  else setPhase('play');
  setAlarm(false);
  alarmOn = false;
}

function handleEvents() {
  for (const ev of s.events) {
    if (s.muted && ev.type !== 'win' && ev.type !== 'caught') continue;
    switch (ev.type) {
      case 'step':
        sfx.step(ev.loud);
        break;
      case 'loot':
        sfx.pickup();
        break;
      case 'vault':
        sfx.vault();
        break;
      case 'smoke':
        sfx.smoke();
        break;
      case 'keycard':
        sfx.keycard();
        break;
      case 'suspicious':
        sfx.suspicious();
        break;
      case 'spotted':
      case 'camera-spot':
        sfx.spotted();
        break;
      case 'caught': {
        sfx.caught();
        const p = s.player;
        applyCaught(s, ev.by);
        s.caughtBy = ev.by;
        if (p.lives <= 0) {
          setPhase('lost');
        } else {
          setPhase('caught');
        }
        break;
      }
      case 'win': {
        sfx.win();
        if (!s.bestTime || s.time < s.bestTime) {
          s.bestTime = s.time;
          try {
            localStorage.setItem('vaultbreak-best', String(Math.round(s.time)));
          } catch { /* storage may be unavailable */ }
        }
        setPhase('won');
        break;
      }
      default:
        break;
    }
  }
  s.events = [];
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const snap = input.snapshot();

  // Staged screenshot (?shot=): render the frozen frame, take no input.
  if (s.freeze) {
    render(ctx, s);
    requestAnimationFrame(frame);
    return;
  }

  if (snap.mute) {
    s.muted = !s.muted;
    setAlarm(false);
    alarmOn = false;
  }
  if (snap.pause && (s.phase === 'play' || s.phase === 'paused')) {
    setPhase(s.phase === 'play' ? 'paused' : 'play');
    sfx.click();
  }

  if (s.phase === 'title' || s.phase === 'caught' || s.phase === 'won' || s.phase === 'lost') {
    // SPACE or click starts / retries. On staged shots the overlay stays
    // until the player acts, so screenshots hold still.
    if (snap.startTap || snap.click) {
      if (s.phase === 'title' && shot === 'start') {
        // Keep the title shot staged: a click on the staged page starts play.
        restart();
      } else {
        restart();
      }
      input.clearClick();
    }
    render(ctx, s);
    requestAnimationFrame(frame);
    return;
  }

  if (s.phase === 'play') {
    s.time += dt;
    updatePlayer(s, snap, dt);
    for (const g of s.guards) updateGuard(g, s, dt);
    for (const c of s.cameras) updateCamera(c, s, dt);
    updateAlarm(s, dt);
    s.maxAlarm = Math.max(s.maxAlarm, s.alarm);
    const wantAlarm = s.alarm >= 70 && !s.muted;
    if (wantAlarm !== alarmOn) {
      alarmOn = wantAlarm;
      setAlarm(wantAlarm);
    }
    if (snap.click) input.clearClick();
  }

  handleEvents();
  render(ctx, s);
  requestAnimationFrame(frame);
}

function fit() {
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.width = VIEW.w;
  canvas.height = VIEW.h;
  canvas.style.width = Math.floor(VIEW.w * scale) + 'px';
  canvas.style.height = Math.floor(VIEW.h * scale) + 'px';
}

window.addEventListener('resize', fit);
fit();
setPhase(s.phase);
requestAnimationFrame(frame);

// Expose a little state for automated playtests (read-only snapshot).
window.__vaultbreak = {
  state: () => ({
    phase: s.phase,
    time: Math.round(s.time * 10) / 10,
    alarm: Math.round(s.alarm),
    loot: s.player.loot,
    lives: s.player.lives,
    guards: s.guards.map((g) => ({ id: g.id, state: g.state, suspicion: Math.round(g.suspicion * 100) / 100 })),
    smokes: s.player.smokes,
  }),
};
