// Screenshot staging: ?shot=start|play|vault|end&seed=N puts the game in a
// fixed, readable state so the screenshots are real renders of this code.
import { makeLoot, makeGuards, makeCameras } from './world.js';
import { makePlayer } from './player.js';

export function applyShot(s, shot) {
  s.freeze = true; // staged screenshots hold still: a real render, frozen
  s.loot = makeLoot();
  s.guards = makeGuards();
  s.cameras = makeCameras();
  s.player = makePlayer();
  s.smokes = [];
  s.alarm = 0;
  s.lockdown = false;
  s.camerasOffT = 0;
  s.events = [];
  s.time = 0;

  if (shot === 'start') {
    s.phase = 'title';
  } else if (shot === 'play') {
    // Mid-heist: two paintings + one gem stolen, Rosa suspicious, alarm warm.
    s.phase = 'play';
    s.time = 74;
    s.player.x = 620;
    s.player.y = 330;
    s.player.loot = 2800;
    s.player.lootItems = ['paint-a', 'paint-b', 'gem-a'];
    for (const id of s.player.lootItems) {
      const item = s.loot.find((l) => l.id === id);
      if (item) item.taken = true;
    }
    s.alarm = 42;
    const rosa = s.guards.find((g) => g.id === 'g2');
    rosa.x = 700;
    rosa.y = 430;
    rosa.dir = Math.atan2(300 - 430, 620 - 700);
    rosa.state = 'suspicious';
    rosa.suspicion = 0.62;
    rosa.lastSeen = { x: 620, y: 300, t: 74 };
    const marco = s.guards.find((g) => g.id === 'g1');
    marco.x = 480;
    marco.y = 220;
    marco.dir = Math.atan2(300 - 220, 620 - 480);
    s.smokes.push({ x: 760, y: 420, r: 115, t: 4 });
    s.player.smokes = 1;
  } else if (shot === 'vault') {
    // At the vault, lockpick half done, camera sweeping in, alarm hot.
    s.phase = 'play';
    s.time = 148;
    s.player.x = 1120;
    s.player.y = 110;
    s.player.loot = 2800;
    s.player.lootItems = ['paint-a', 'paint-b', 'gem-a'];
    for (const id of s.player.lootItems) {
      const item = s.loot.find((l) => l.id === id);
      if (item) item.taken = true;
    }
    s.player.channeling = true;
    s.player.vaultT = 1.6;
    s.alarm = 63;
    const viktor = s.guards.find((g) => g.id === 'g3');
    viktor.x = 1050;
    viktor.y = 260;
    viktor.dir = Math.atan2(130 - 260, 1120 - 1050);
    viktor.state = 'suspicious';
    viktor.suspicion = 0.5;
    viktor.lastSeen = { x: 1120, y: 130, t: 148 };
    s.player.smokes = 1;
  } else if (shot === 'end') {
    // Clean getaway: vault cracked, van reached.
    s.phase = 'won';
    s.time = 212;
    s.player.loot = 7800;
    s.player.lootItems = ['paint-a', 'paint-b', 'gem-a', 'gem-b', 'vault'];
    for (const item of s.loot) item.taken = true;
    s.player.x = 260;
    s.player.y = 770;
    s.alarm = 88;
    s.maxAlarm = 88;
    s.bestTime = 212;
  }
}
