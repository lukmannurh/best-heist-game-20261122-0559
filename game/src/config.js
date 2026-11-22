// VAULTBREAK — The Meridian Job. Tuning constants. Pure data, no DOM.
export const VIEW = { w: 1280, h: 800 };
export const HUD_H = 48;

// Building bounds (outer walls form this rect; street strip below it).
export const BUILDING = { x: 20, y: 60, w: 1240, h: 680 };
export const STREET_Y = 740;

export const PLAYER = {
  r: 13,
  walk: 175,
  sneak: 105,
  sprint: 255,
  noiseWalk: 46,
  noiseSprint: 135,
  noiseSneak: 0,
};

export const DETECTION = {
  guardRange: 225,
  guardHalfAngle: 0.61, // ~35 degrees
  cameraRange: 265,
  cameraHalfAngle: 0.5,
  // suspicion gained per second at point-blank, scaled by distance + stance
  rateClose: 1.5,
  rateFar: 0.35,
  sneakMul: 0.55,
  shadowMul: 0.5,
  sprintMul: 1.45,
  decay: 0.45, // suspicion lost per second unseen
  suspiciousAt: 0.35,
  alertAt: 1.0,
};

export const ALARM = {
  decay: 2.2, // per second while nobody spots the player
  cameraSpotRate: 26, // per second while a camera sees the player
  guardSpotRate: 18, // per second while a guard is suspicious (>0.6)
  vaultOpenBump: 15,
  lockdownAt: 70, // guards converge + move faster
  chaseSpeedMul: 1.18,
  lockdownSpeedMul: 1.15,
};

export const TOOLS = {
  smokeCount: 2,
  smokeRadius: 115,
  smokeSecs: 6,
  keycardCameraOffSecs: 20,
  vaultChannelSecs: 3,
};

export const LOOT_TARGET_WIN = 2000; // dollars needed before the van counts
export const LIVES = 3;

export const COLORS = {
  bg: '#0b0e14',
  floor: '#232833',
  floorDark: '#1b1f2a',
  floorTile: '#2a3040',
  wall: '#4a5468',
  wallTop: '#6b7891',
  hudBg: 'rgba(8,10,16,0.92)',
  hudLine: '#3a4358',
  gold: '#f5c542',
  alarm: '#ff4d4d',
  alarmMid: '#ffb02e',
  ok: '#58d68d',
  cone: 'rgba(245,197,66,0.20)',
  coneAlert: 'rgba(255,77,77,0.28)',
  camCone: 'rgba(255,90,90,0.16)',
  smoke: 'rgba(200,205,215,0.55)',
  van: '#c0392b',
};
