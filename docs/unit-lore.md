# Unit Lore

The **Unit Lore** page shows each unit's in-game description. The text belongs to Creative Assembly / Games Workshop, so it is not shipped with Grudgekeeper. You build it from your own copy of the game, and it stays on your PC.

## 1. Export the tables with RPFM

1. Install [RPFM](https://github.com/Frodo45127/rpfm/releases) and set the game to **Warhammer 3** (it will download the schema the first time).
2. In RPFM's settings, turn on exporting tables as TSV when extracting.
3. Open `data.pack` from the game's `data` folder. Extract these two folders into one empty folder, e.g. `C:\unit-export`:
   - `db/main_units_tables`
   - `db/land_units_tables`
4. Open `local_en.pack` (same `data` folder) and extract the whole `text` folder into that same folder.

## 2. Build the lore file

From the Grudgekeeper source folder:

```
node scripts/build-unit-lore.mjs C:\unit-export unit-lore.json
```

It prints how many units it found per race. Units under `Other (xyz)` are races the script doesn't recognise yet.

## 3. Load it in the app

Open **Unit Lore** in the sidebar, click **Load lore file** and pick `unit-lore.json`. Re-run the steps after a game update to pick up new units.
