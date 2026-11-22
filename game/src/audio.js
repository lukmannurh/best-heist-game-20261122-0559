// Tiny WebAudio synth: blips, chimes, alarm. No audio files, no network.
// Safe to import headless: everything is lazy and guarded.
let ctx = null;
let alarmNodes = null;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, vol, when = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  step(loud) {
    tone(loud ? 140 : 95, 0.05, 'triangle', loud ? 0.05 : 0.025);
  },
  pickup() {
    tone(880, 0.09, 'sine', 0.09);
    tone(1318, 0.12, 'sine', 0.07, 0.07);
  },
  vault() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'sine', 0.08, i * 0.09));
  },
  smoke() {
    tone(320, 0.35, 'sawtooth', 0.04);
    tone(180, 0.4, 'sawtooth', 0.03, 0.05);
  },
  keycard() {
    tone(1046, 0.08, 'square', 0.05);
    tone(1568, 0.1, 'square', 0.04, 0.08);
  },
  suspicious() {
    tone(392, 0.12, 'square', 0.05);
    tone(311, 0.16, 'square', 0.05, 0.1);
  },
  spotted() {
    tone(220, 0.2, 'sawtooth', 0.08);
    tone(174, 0.3, 'sawtooth', 0.08, 0.12);
  },
  caught() {
    [440, 349, 277, 220].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.08, i * 0.14));
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, i * 0.11));
  },
  click() {
    tone(660, 0.05, 'sine', 0.05);
  },
};

export function setAlarm(on) {
  const c = ac();
  if (!c) return;
  if (on && !alarmNodes) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = 620;
    g.gain.value = 0.0;
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 2.2;
    lg.gain.value = 0.035;
    lfo.connect(lg);
    lg.connect(g.gain);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    lfo.start();
    alarmNodes = { o, lfo, g };
  } else if (!on && alarmNodes) {
    try {
      alarmNodes.o.stop();
      alarmNodes.lfo.stop();
    } catch { /* already stopped */ }
    alarmNodes = null;
  }
}
