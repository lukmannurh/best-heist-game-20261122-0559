// Keyboard + mouse input. Produces one snapshot per frame for updatePlayer.
// Keys: WASD/arrows move, Shift sneak, Space sprint, E grab / hold to pick,
// Q smoke bomb, P pause, M mute, ? help. Click-to-move with the mouse.
// Edge taps (Space/Q/E/P/M) are recorded on keydown and consumed by the
// next snapshot, so even a very quick tap is never lost between frames.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since the last snapshot
  let click = null; // {x, y} in canvas logical coords, or null
  let mouse = { x: 0, y: 0 };

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 1280,
      y: ((e.clientY - r.top) / r.height) * 800,
    };
  }

  function normKey(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    const k = normKey(e);
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(normKey(e));
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    click = toLogical(e);
  });
  canvas.addEventListener('mousemove', (e) => {
    mouse = toLogical(e);
  });

  return {
    get mouse() {
      return mouse;
    },
    get click() {
      return click;
    },
    clearClick() {
      click = null;
    },
    snapshot() {
      let mx = 0;
      let my = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) mx += 1;
      if (keys.has('w') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) my += 1;
      const grabHeld = keys.has('e');
      const snap = {
        mx,
        my,
        sneak: keys.has('Shift'),
        sprint: keys.has(' '),
        startTap: pressed.has(' '),
        grab: pressed.has('e'),
        grabHeld,
        smoke: pressed.has('q'),
        pause: pressed.has('p'),
        mute: pressed.has('m'),
        click,
      };
      pressed.clear();
      return snap;
    },
  };
}
