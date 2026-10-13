// Builds unit-lore.json from tables exported out of your own copy of
// Total War: Warhammer III with RPFM (as TSV). The output stays on your PC:
// load it in the app from the Units page. Do not commit it, the text belongs
// to Creative Assembly / Games Workshop.
//
// Usage: node scripts/build-unit-lore.mjs <folder with RPFM TSV exports> [output file]
//
// The folder needs (any file names, subfolders are fine):
//   - main_units_tables        (from db.pack, db/main_units_tables)
//   - land_units_tables        (from db.pack, db/land_units_tables)
//   - the English .loc text    (from local_en.pack, each .loc exported as TSV)

import fs from "node:fs";
import path from "node:path";

const [inputDir, outputArg] = process.argv.slice(2);
if (!inputDir) {
    console.error("Usage: node scripts/build-unit-lore.mjs <export folder> [output file]");
    process.exit(1);
}
const outputFile = outputArg ?? "unit-lore.json";

// Faction code inside unit keys (wh_main_dwf_inf_miners_0 -> dwf) to race name.
const RACES = {
    dwf: "Dwarfs", emp: "Empire", grn: "Greenskins", vmp: "Vampire Counts",
    brt: "Bretonnia", chs: "Warriors of Chaos", bst: "Beastmen", wef: "Wood Elves",
    nor: "Norsca", hef: "High Elves", def: "Dark Elves", lzd: "Lizardmen",
    skv: "Skaven", tmb: "Tomb Kings", cst: "Vampire Coast", kho: "Khorne",
    nur: "Nurgle", sla: "Slaanesh", tze: "Tzeentch", dae: "Daemons of Chaos",
    ksl: "Kislev", cth: "Grand Cathay", ogr: "Ogre Kingdoms", chd: "Chaos Dwarfs",
    woc: "Warriors of Chaos", huntmarshall: "Empire", throgg: "Norsca",
    teb: "Southern Realms", neu: "Neutral", monster: "Wild Monsters",
};

// Prologue, test and quick-battle-only copies of units.
const SKIP = /_(prologue|test|pro\d+)_/;

const TYPES = {
    lord: "Lords", hero: "Heroes", melee_infantry: "Melee Infantry",
    missile_infantry: "Missile Infantry", monstrous_infantry: "Monstrous Infantry",
    cavalry: "Cavalry", missile_cavalry: "Missile Cavalry", monstrous_cavalry: "Monstrous Cavalry",
    chariot: "Chariots", warbeast: "War Beasts", war_beast: "War Beasts",
    monster: "Monsters", war_machine: "War Machines",
};

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : [p];
    });
}

function unquote(field) {
    if (field.length >= 2 && field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
}

// RPFM TSV: a header row of column names plus a "#table;version;path" row.
function readTsv(file) {
    const lines = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/);
    let header = null;
    const rows = [];
    for (const line of lines) {
        if (!line || line.startsWith("#")) continue;
        const cells = line.split("\t").map(unquote);
        if (!header) { header = cells; continue; }
        const row = {};
        header.forEach((h, i) => { row[h] = cells[i] ?? ""; });
        rows.push(row);
    }
    return { header: header ?? [], rows };
}

function cleanText(text) {
    return text
        .replace(/\\\\n|\\n/g, "\n")
        .replace(/\\t/g, " ")
        .replace(/\[\[\/?[^\]]*\]\]/g, "")
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
}

const loc = new Map();
const mainUnits = [];
const landUnits = new Map();

for (const file of walk(inputDir)) {
    if (!/\.(tsv|txt)$/i.test(file)) continue;
    const { header, rows } = readTsv(file);
    if (header.includes("key") && header.includes("text") && header.includes("tooltip")) {
        rows.forEach((r) => loc.set(r.key, r.text));
    } else if (header.includes("unit") && header.includes("land_unit") && header.includes("caste")) {
        mainUnits.push(...rows);
    } else if (header.includes("key") && header.includes("historical_description_text")) {
        rows.forEach((r) => landUnits.set(r.key, r));
    }
}

console.log(`Read ${mainUnits.length} units, ${landUnits.size} land units, ${loc.size} text entries.`);
if (!mainUnits.length || !landUnits.size || !loc.size) {
    console.error("Missing main_units_tables, land_units_tables or the .loc text. Check the export folder.");
    process.exit(1);
}

const byRaceAndName = new Map();
let skipped = 0;
for (const mu of mainUnits) {
    if (mu.is_naval === "true" || SKIP.test(mu.unit)) { skipped++; continue; }
    const lu = landUnits.get(mu.land_unit);
    const name = cleanText(loc.get(`land_units_onscreen_name_${mu.land_unit}`) ?? "");
    const lore = cleanText(loc.get(`unit_description_historical_texts_text_${lu?.historical_description_text}`) ?? "");
    if (!lu || !name || !lore) { skipped++; continue; }

    const code = mu.unit.split("_").find((part) => RACES[part]) ?? mu.unit.split("_")[2] ?? "?";
    const summary = cleanText(loc.get(`unit_description_short_texts_text_${lu.short_description_text}`) ?? "");
    const unit = {
        key: mu.unit,
        race: RACES[code] ?? `Other (${code})`,
        name,
        type: TYPES[mu.caste] ?? mu.caste,
        summary: summary === lore ? "" : summary,
        lore,
    };
    // The game has many copies of the same unit (summoned, campaign-only, etc.); keep one.
    const id = `${unit.race}|${unit.name}`;
    const existing = byRaceAndName.get(id);
    if (!existing || unit.lore.length > existing.lore.length) byRaceAndName.set(id, unit);
}

const units = [...byRaceAndName.values()].sort((a, b) =>
    a.race.localeCompare(b.race) || a.name.localeCompare(b.name));

fs.writeFileSync(outputFile, JSON.stringify({ format: "grudgekeeper-unit-lore", version: 1, generated: new Date().toISOString(), units }, null, 1));

const counts = {};
units.forEach((u) => { counts[u.race] = (counts[u.race] ?? 0) + 1; });
console.log(`Wrote ${units.length} units to ${outputFile} (${skipped} skipped: naval, prologue/test, no name or no lore).`);
Object.entries(counts).forEach(([race, n]) => console.log(`  ${race}: ${n}`));
