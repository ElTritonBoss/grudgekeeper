# Campaign logger

The **Grudgekeeper Logger** is a small Warhammer III script mod. While you
play, it writes what happens in your campaign to a log file, and Grudgekeeper
shows that log live as a campaign chronicle.

## What it records

| Event | Details |
|---|---|
| Campaign start | Faction, faction leader, real date and time |
| Every turn | Treasury, settlement count, and every army: lord, rank, units and their health |
| Battles | Result (heroic/decisive/close/pyrrhic victory or defeat), location, siege/ambush/night/naval, autoresolve, kills and losses per side, **each of your lords' personal kills**, units on both sides |
| Lords and heroes | Recruited or joined (events, confederation), rank-ups, wounded |
| Settlements | Taken and lost |
| Confederations | Factions you confederate |

All of this comes from the game's own campaign script events (checked against
the 9.0 scripting docs the game ships). The mod only reads game state and
writes a text file, so it can't change your campaign. It is safe to add
mid-campaign (it logs from that point) and safe to remove.

It doesn't affect achievements. It switches itself off in multiplayer.

## Install

From `C:\Users\<you>\grudgekeeper-src` in PowerShell:

```powershell
node scripts\build-logger-pack.mjs
Copy-Item .\mod\dist\grudgekeeper_logger.pack "S:\SteamLibrary\steamapps\common\Total War WARHAMMER III\data\" -Force
```

Then tick **grudgekeeper_logger** in the game launcher's mod list.

After changing the mod's Lua, run the same two lines again.

## Where the log goes

`%APPDATA%\Grudgekeeper\campaign-log-<faction>_<date>_<time>.jsonl`, one file
per campaign. If the game can't write there, the file goes in the game folder as
`grudgekeeper-campaign-log-…jsonl`. Grudgekeeper looks in both places, and finds
game folders in any Steam library.

## Reloading saves

Every event carries a counter that is stored in your save. When you load a
save, the mod notes which counter that save had, and the app drops anything
logged after it. So a battle you lost and then reloaded disappears from the
chronicle.

## Log format

One JSON object per line. Common fields: `t` (event type), `n` (counter),
`turn`, `at` (local time), `campaign` (id). Types: `start`, `load`, `turn`,
`battle`, `recruit`, `character_created`, `rank_up`, `lord_down`,
`region_gained`, `region_lost`, `confederation`, `unit_names` (display names
for unit keys). See `mod/grudgekeeper_logger/script/campaign/mod/grudgekeeper_logger.lua`.

## Testing without the game

```
lua5.1 mod/test/harness.lua mod/grudgekeeper_logger/script/campaign/mod/grudgekeeper_logger.lua <out dir>
```

runs the script against stubbed game interfaces and writes a sample log.
Setting `GRUDGEKEEPER_LOG_DIR` makes the app read logs from another folder too.
