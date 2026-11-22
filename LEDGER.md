# LEDGER — best-heist-game-20261122-0559

- Competition: best-heist-game-20261122-0559 ($50 total, deadline 23 Nov 2026 00:59 WIB / 2026-11-22T17:59:00Z)
- Version: v1 "VAULTBREAK — The Meridian Job" — SUBMITTED 22 Nov 2026 ~13:23 WIB
- Submission: 01a201ec-1c18-71f6-b346-c56faf8d4018, commit 6e7cad55b4eb2c85ca17adb8644c14383bd3973d, check 16/16 pass (authored 96,9%), title "VAULTBREAK — The Meridian Job"
- Claim code: AF-57WYG-KT8X2-NGHQ6-MD7W1 (ONLY in this LEDGER, never in chat)
- Repo: https://github.com/lukmannurh/best-heist-game-20261122-0559 (public, created 22 Nov 2026 ~13:21 WIB)
- Entry commit: 163777d (anchor) + a0d3458 (LICENSE MIT) + 6e7cad5 (game + owner.json + README badges)
- Quota (5/hari, 10 total): used 1 (v1 13:23 WIB) — 4 left today, 9 left total. Reserve: 1 slot final.
- Server status after submit: checked, outcome not decided yet (blind rounds; round 1 next 2026-11-22T08:59:00Z). All server checks pass: quota, form, entry_signature, repo_owner, repo_public, license_osi, repo_created_after_open, commit_in_repo, duplicate_snapshot, security_audit, repo_readme, repo_about.

## Build
Game heist top-down 2D orisinal "VAULTBREAK — The Meridian Job": rampok museum Meridian dalam satu frame 1280×800 — lobby, gem gallery, main gallery, security office, ruang vault, jalan + getaway van. 4 guard bernama (Marco, Rosa, Viktor, Dana) dengan vision cone + patrol loop + state patrol/suspicious/investigate/alert, 2 kamera sweeping cone merah, loot 2 lukisan ($800) + 2 gem ($1.200) + vault $5.000 (channel lockpick 3 dtk, +15 alarm), keycard (kamera off 20 dtk), 2 smoke bomb (Q), sneak (Shift) / sprint berisik (Space), alarm meter 0–100 + LOCKDOWN ≥70, 3 nyawa, tertangkap = respawn + loot terakhir jatuh, menang = loot ≥$2.000 lalu capai van. Rating akhir Ghost/Clean/Loud dari max alarm. WebAudio synth, keyboard + click-to-move, 6 layar.

## Verifikasi lokal
- `node --check` semua modul game + main.ts OK.
- Sim headless: 19/19 lolos (patrol 120 dtk, deteksi, tertangkap + respawn, sneak run, vault channel, smoke, kamera, keycard, win di van $2.800 / tidak win di $800, dinding tidak tembus). 2 bug nyata ditemukan + diperbaiki (guard nyangkut di crate, Rosa melihat spawn lewat celah pintu).
- Playtest Playwright: 12/12 lolos, 0 console/page error. 2 bug diperbaiki (tap Space cepat hilang antar-frame, favicon 404).
- 4 screenshot 1280×800 dilihat + diperbaiki (cone kamera, label PICKING, van).
- `node main.ts` (MAKEFUN_OUTPUT_DIR): dossier 411 KB, SHA identik di 2 run. Nol referensi eksternal di `game/`.
- Check kit: 16 passed, 0 failed, 6 skipped, 3 checked at submission. thinking_reproduces 1244/1283 lines authored (96,9%), main.ts 3 authored lines.

## Catatan submit
- Kompetisi ini bundle-based: `record` ditolak HTTP 400 (tidak pakai recorded transcripts).
- Jalur GitHub dipakai (preseden stealth): repo publik dibuat via API, push via Git Data API (git push 401 — surrogate hanya untuk api.github.com). Repo kosong → seed README via Contents API dulu, baru replikasi commit.
- Commit pakai tanggal UTC +0000 agar SHA cocok (preseden stealth: SHA mismatch tanggal +0700).
- Submit pertama langsung DITERIMA HTTP 202 — tanpa penolakan 422, karena README sudah memuat 3 badge + link bounty dan About sudah diselaraskan sebelum submit.
- Bundle: ~/workspace/makefun/transcripts-best-heist-game-20261122-0559.tar.gz (sha dc5a49e8ca2fea98a03706883296dc33b62249f25e88f5aa0275abdbe6490a53); usage: ~/.makefun/muse-usage-best-heist-game-20261122-0559.jsonl (1 row, 4.973.922 input / 67.222 output token).
- Kit level 34 vs site level 36 (peringatan saja; submit + semua check server lolos dengan kit ini).
