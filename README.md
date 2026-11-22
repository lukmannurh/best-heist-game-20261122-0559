[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/lukmannurh/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/lukmannurh/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Entered on [make.fun](https://make.fun/?ref=pkcbvd3n&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards

# VAULTBREAK — The Meridian Job

A top-down 2D heist game for the make.fun "Make the best heist game"
competition. Original work, no commercial copies.

## The game

Rob the Meridian museum in a single frame: lobby, gem gallery, main
gallery, security office, vault room, and the street with your getaway van.
Four named guards (Marco, Rosa, Viktor, Dana) patrol with vision cones and
three states — patrol, suspicious, investigate, alert — plus two sweeping
security cameras with red cones.

- **Loot:** 2 paintings ($800) + 2 gems ($1,200) + the vault ($5,000,
  3-second lockpick channel, +15 alarm).
- **Tools:** keycard (cameras off 20 s), 2 smoke bombs (Q) that block sight.
- **Move:** sneak (Shift, silent) or sprint (Space, noisy). Getting caught
  costs a life, respawns you, and drops your last loot — 3 lives.
- **Alarm meter 0–100:** at 70+ the museum goes into LOCKDOWN.
- **Win:** loot at least $2,000, then reach the van. Final rating:
  Ghost / Clean / Loud, from your max alarm.

## Controls

WASD / arrows or click the floor to move, Shift to sneak, Space to sprint,
Q for smoke, P to pause. WebAudio synth sounds, no audio files. Six
screens: title, play, paused, caught, won, lost.

## Play it

Serve `game/` with any static server, then open http://localhost:8080.
Screenshots are staged with `?shot=start|play|vault|end`.
