// Merges RPFM TSV exports of mod packs over a vanilla export, the way the game
// loads them, so the builders see the tables you actually play with.
//
// Usage: node scripts/merge-mod-tables.mjs <vanilla export> <output folder> <mod export> [more mod exports...]
//        [--schema <schema_wh3.ron>]
//
// Mod exports are given in load order (the top of used_mods.txt first). Rules, as the
// engine applies them:
//   - A file that a higher-priority pack ships at the same path (e.g. db/x_tables/data__)
//     replaces the lower one entirely.
//   - Otherwise rows from every pack are combined. Mod packs load before vanilla, and inside
//     one pack files load in name order, so for rows with the same primary key the first one
//     loaded wins. Primary keys come from RPFM's schema.
//   - Rows marked mod_disabled = true remove the row they shadow.
//   - .loc text works the same way, keyed by "key".
// Only tables present in the vanilla export are merged; everything else in the vanilla
// export (campaign scripts, xml) is copied unchanged.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
let schemaFile = path.join(process.env.APPDATA ?? path.join(os.homedir(), ".config"),
    "FrodoWazEre", "rpfm", "config", "schemas", "schema_wh3.ron");
const schemaAt = args.indexOf("--schema");
if (schemaAt >= 0) { schemaFile = args[schemaAt + 1]; args.splice(schemaAt, 2); }
const [vanillaDir, outDir, ...modDirs] = args;
if (!vanillaDir || !outDir || !modDirs.length) {
    console.error("Usage: node scripts/merge-mod-tables.mjs <vanilla export> <output folder> <mod export> [...] [--schema file]");
    process.exit(1);
}

// --- schema: primary key columns for each table and version ---
function readKeys(file) {
    const keys = new Map(); // "<table>_tables" -> Map(version -> [key columns])
    if (!fs.existsSync(file)) {
        console.warn(`No RPFM schema at ${file}; rows are only merged by whole-row identity.`);
        return keys;
    }
    const src = fs.readFileSync(file, "utf8");
    const defsEnd = src.indexOf("\n    patches:");
    const defs = defsEnd > 0 ? src.slice(0, defsEnd) : src;
    const tableRe = /^ {8}"(\w+_tables)": \[$/gm;
    const starts = [...defs.matchAll(tableRe)];
    starts.forEach((m, i) => {
        const block = defs.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : defs.length);
        const versions = new Map();
        const parts = block.split(/^ {16}version: (\d+),$/m);
        for (let p = 1; p < parts.length; p += 2) {
            const cols = [...parts[p + 1].matchAll(/name: "([^"]+)",[\s\S]*?is_key: (true|false)/g)]
                .filter((f) => f[2] === "true").map((f) => f[1]);
            versions.set(Number(parts[p]), cols);
        }
        keys.set(m[1], versions);
    });
    return keys;
}
const schemaKeys = readKeys(schemaFile);

function keyColumns(table, version, header) {
    const versions = schemaKeys.get(table);
    let cols = versions?.get(version);
    if (!cols && versions?.size) cols = versions.get(Math.max(...versions.keys()));
    cols = (cols ?? []).filter((c) => header.includes(c));
    return cols.length ? cols : header.filter((c) => c !== "mod_disabled"); // whole-row identity
}

// --- TSV io (RPFM format: header row, "#table;version;path" row, data rows) ---
function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : [p];
    });
}

function readTsv(file) {
    const lines = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/);
    let header = null, table = "", version = 0, packPath = "";
    const rows = [];
    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith("#") && header && !table) {
            [table, version, packPath] = line.slice(1).split("\t")[0].split(";");
            version = Number(version) || 0;
            continue;
        }
        const cells = line.split("\t");
        if (!header) { header = cells; continue; }
        const row = {};
        header.forEach((h, i) => { row[h] = cells[i] ?? ""; }); // cells stay raw (quoted as exported)
        rows.push(row);
    }
    return { header: header ?? [], table, version, packPath: (packPath || "").toLowerCase(), rows };
}

function writeTsv(file, header, table, version, packPath, rows) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const pad = "\t".repeat(Math.max(0, header.length - 1));
    const out = [header.join("\t"), `#${table};${version};${packPath}${pad}`];
    for (const r of rows) out.push(header.map((h) => r[h] ?? "").join("\t"));
    fs.writeFileSync(file, out.join("\n") + "\n", "utf8");
}

// Group every TSV of an export by table, in the order the engine reads them.
function collect(dir, source) {
    const byTable = new Map();
    for (const file of walk(dir)) {
        if (!/\.tsv$/i.test(file)) continue;
        const t = readTsv(file);
        if (!t.table) continue;
        if (!byTable.has(t.table)) byTable.set(t.table, []);
        byTable.get(t.table).push({ ...t, file, source });
    }
    for (const files of byTable.values()) {
        files.sort((a, b) => (a.packPath < b.packPath ? -1 : a.packPath > b.packPath ? 1 : 0));
    }
    return byTable;
}

// --- merge ---
const vanilla = collect(vanillaDir, "vanilla");
const mods = modDirs.map((d) => collect(d, path.basename(d)));
fs.rmSync(outDir, { recursive: true, force: true });

const report = [];
for (const [table, vanillaFiles] of vanilla) {
    const files = [];
    const seenPaths = new Set();
    for (const group of [...mods.map((m) => m.get(table) ?? []), vanillaFiles]) {
        for (const f of group) {
            if (seenPaths.has(f.packPath)) continue; // a higher pack replaced this file
            seenPaths.add(f.packPath);
            files.push(f);
        }
    }
    const fromMods = files.filter((f) => f.source !== "vanilla");
    const replaced = vanillaFiles.filter((f) => !files.includes(f)).length;
    const isLoc = table === "Loc";
    const base = vanillaFiles[0];
    const header = [...base.header];
    for (const f of fromMods) for (const h of f.header) if (!header.includes(h)) header.push(h);

    if (!fromMods.length) {
        // untouched: copy the vanilla files as they are
        for (const f of vanillaFiles) {
            const dest = path.join(outDir, path.relative(vanillaDir, f.file));
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(f.file, dest);
        }
        continue;
    }

    const kept = new Map();
    let shadowed = 0;
    for (const f of files) {
        const cols = isLoc ? ["key"] : keyColumns(table, f.version, f.header);
        for (const r of f.rows) {
            const k = cols.map((c) => r[c]).join("\u0001");
            if (kept.has(k)) { shadowed++; continue; }
            kept.set(k, r);
        }
    }
    const rows = [...kept.values()];
    const merged = rows.filter((r) => r.mod_disabled !== "true");
    const disabled = rows.length - merged.length;
    const modRows = fromMods.reduce((n, f) => n + f.rows.length, 0);
    const packPath = isLoc ? "text/db/merged__" : `db/${table}/data__`;
    const dest = path.join(outDir, isLoc ? "text/db/merged__.loc.tsv" : `db/${table}/data__.tsv`);
    writeTsv(dest, header, table, base.version, packPath, merged);
    report.push({ table, modRows, replaced, shadowed, disabled, rows: merged.length });
}

// copy everything that is not a table (campaign scripts, xml)
for (const file of walk(vanillaDir)) {
    if (/\.tsv$/i.test(file)) continue;
    const dest = path.join(outDir, path.relative(vanillaDir, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
}

console.log(`Merged ${modDirs.length} mod export(s) into ${report.length} of ${vanilla.size} tables:`);
for (const r of report.sort((a, b) => b.modRows - a.modRows)) {
    const notes = [r.replaced && `${r.replaced} vanilla file(s) replaced`, r.shadowed && `${r.shadowed} rows overridden`,
        r.disabled && `${r.disabled} rows removed`].filter(Boolean).join(", ");
    console.log(`  ${r.table}: ${r.modRows} mod rows${notes ? ` (${notes})` : ""}`);
}
