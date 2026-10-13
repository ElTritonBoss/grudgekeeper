# Unit Lore

The **Unit Lore** page shows each unit's in-game description. The text belongs to Creative Assembly / Games Workshop, so it is not shipped with Grudgekeeper. You build it from your own copy of the game, and it stays on your PC.

## 1. Export the tables with RPFM

RPFM v5 no longer has a command-line tool, so this uses the normal app (`rpfm_ui.exe`).

1. Download [RPFM](https://github.com/Frodo45127/rpfm/releases), unzip it into `tools\rpfm` inside the Grudgekeeper source folder (git ignores it), and set the game to **Warhammer 3**. It downloads the table schemas the first time.
2. Open `db.pack` from the game's `data` folder (not `data.pack`, which doesn't hold the unit tables). Export `db/main_units_tables` and `db/land_units_tables` as TSV into the `unit-export` folder inside the Grudgekeeper source folder (git ignores it).
3. Open `local_en.pack` from the same `data` folder. Export the `text` folder as **TSV** into that same folder. If you get binary `.loc` files instead, the Warhammer 3 schema isn't loaded yet.

## 2. Build the lore file

From the Grudgekeeper source folder:

```
node scripts/build-unit-lore.mjs unit-export
```

It prints how many units it found per race, and saves the file to `%APPDATA%\Grudgekeeper\unit-lore.json`. Units under `Other (xyz)` are races the script doesn't recognise yet. Add a second path to also save a copy there, e.g. `node scripts/build-unit-lore.mjs unit-export unit-lore.json`.

## 3. Open it in the app

Open **Unit Lore** in the sidebar. The page loads the file from `%APPDATA%\Grudgekeeper` by itself, and picks up a rebuilt file the next time you open the page. **Load lore file** is still there if you want to load a file from somewhere else.

Re-run steps 1 and 2 after a game update to pick up new units.
