// Builds lord-details.json from tables exported out of your own copy of
// Total War: Warhammer III with RPFM (as TSV). The output stays on your PC:
// load it in the app from the Dashboard. Do not commit it, the text belongs
// to Creative Assembly / Games Workshop.
//
// Usage: node scripts/build-lord-details.mjs <folder with RPFM TSV exports> [output file] [races.csv] [--all-skills]
//
// The folder needs (any file names, subfolders are fine), all from db.pack:
//   agent_subtypes, frontend_faction_leaders, factions, cultures_subcultures,
//   character_skill_node_sets, character_skill_node_set_items, character_skill_nodes,
//   character_skill_level_to_effects_junctions, effect_bonus_value_ids_unit_sets,
//   effect_bonus_value_unit_record_junctions, effect_bonus_value_unit_set_unit_ability_junctions,
//   effect_bonus_value_unit_set_unit_attribute_junctions, unit_set_unit_ability_junctions,
//   unit_set_unit_attribute_junctions, unit_set_to_unit_junctions, unique_agents,
//   faction_agent_permitted_subtypes, main_units
// plus the English .loc text (local_en.pack, each .loc exported as TSV) and,
// for legendary hero unlocks, the campaign scripts from data_script.pack (script/).
//
// Units: only skill effects tied to unit sets made of named units are kept, not
// effects on whole unit classes, categories or the army. Skills that generic
// (non-legendary) lords also get are left out unless you pass --all-skills.
// Heroes: unlock conditions come from character_unlocking.character_data in
// script/campaign/wh3_main_legendary_characters.lua. Other unique heroes the
// faction is permitted to have are listed with "unverified": true.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const allSkills = args.includes("--all-skills");
const [inputDir, outputArg, racesArg] = args.filter((a) => !a.startsWith("--"));
if (!inputDir) {
    console.error("Usage: node scripts/build-lord-details.mjs <export folder> [output file] [races.csv] [--all-skills]");
    process.exit(1);
}
const outputFile = outputArg ?? "lord-details.json";
const racesFile = racesArg ?? "public/data/races.csv";

const SKIP = /_(prologue|test|pro\d+)_/;
const CAMPAIGNS = { main_warhammer: "Immortal Empires", wh3_main_chaos: "Realm of Chaos" };

// TW_WH3_THRONES_OF_DECAY_DWF -> "Thrones of Decay"
function dlcName(key) {
    const words = key.replace(/^TW_WH\d?_/, "").replace(/_(DWF|EMP|GRN|VMP|BRT|CHS|BST|WEF|NOR|HEF|DEF|LZD|SKV|TMB|CST|KHO|NUR|SLA|TZE|DAE|KSL|CTH|OGR|CHD|WOC|TOD)$/, "").toLowerCase().split("_");
    const small = new Set(["of", "the", "and"]);
    return words.map((w, i) => (i && small.has(w) ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
}

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
    let table = "";
    const rows = [];
    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith("#")) { table ||= line.slice(1).split(";")[0]; continue; }
        const cells = line.split("\t").map(unquote);
        if (!header) { header = cells; continue; }
        const row = {};
        header.forEach((h, i) => { row[h] = cells[i] ?? ""; });
        rows.push(row);
    }
    return { table, rows };
}

function readCsv(file) {
    const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); cell = "";
            if (row.some((x) => x)) rows.push(row);
            row = [];
        } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x)) rows.push(row);
    const [header, ...body] = rows;
    return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// --- load everything ---
const loc = new Map();
const tables = {};
const scripts = [];
for (const file of walk(inputDir)) {
    if (/\.lua$/i.test(file)) { scripts.push(file); continue; }
    if (!/\.(tsv|txt)$/i.test(file)) continue;
    const { table, rows } = readTsv(file);
    if (table === "Loc") rows.forEach((r) => loc.set(r.key, r.text));
    else if (table) (tables[table] ??= []).push(...rows);
}
const t = (name) => tables[`${name}_tables`] ?? [];
const NEEDED = ["agent_subtypes", "frontend_faction_leaders", "character_skill_node_sets", "character_skill_node_set_items",
    "character_skill_nodes", "character_skill_level_to_effects_junctions", "unit_set_to_unit_junctions", "main_units"];
const missing = NEEDED.filter((n) => !t(n).length);
console.log(`Read ${Object.keys(tables).length} tables, ${loc.size} text entries, ${scripts.length} scripts.`);
if (missing.length || !loc.size) {
    console.error(`Missing ${[...missing, ...(loc.size ? [] : ["the .loc text"])].join(", ")}. Check the export folder.`);
    process.exit(1);
}

function text(key, depth = 0) {
    const raw = loc.get(key);
    if (raw == null || depth > 5) return "";
    return raw.replace(/\{\{tr:([^}]+)\}\}/g, (_, k) => text(k.trim(), depth + 1));
}

function cleanText(s) {
    return s
        .replace(/\\\\n|\\n/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\[\[img:[^\]]*\]\]\[\[\/img\]\]/g, "")
        .replace(/\[\[\/?[^\]]*\]\]/g, "")
        .replace(/\{\{[^}]*\}\}/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

const by = (rows, key) => {
    const m = new Map();
    for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); }
    return m;
};

// --- units ---
const mainUnits = new Map(t("main_units").map((r) => [r.unit, r]));
function unitName(unitKey) {
    const mu = mainUnits.get(unitKey);
    return cleanText(text(`land_units_onscreen_name_${mu?.land_unit ?? unitKey}`));
}

// unit_set -> list of unit keys, or null when the set is (partly) a class, category or caste.
const MAX_SET_UNITS = 25;
const setRows = by(t("unit_set_to_unit_junctions"), "unit_set");
const setUnits = new Map();
for (const [set, rows] of setRows) {
    const include = rows.filter((r) => r.exclude !== "true");
    const exclude = new Set(rows.filter((r) => r.exclude === "true").map((r) => r.unit_record));
    if (!include.length || include.some((r) => !r.unit_record || r.unit_caste || r.unit_category || r.unit_class)) {
        setUnits.set(set, null);
        continue;
    }
    const units = include.map((r) => r.unit_record).filter((u) => !exclude.has(u));
    // A list of every unit of a god or race (or every Regiment of Renown) is an army-wide buff in all but name.
    const names = new Set(units.map(unitName).filter(Boolean));
    setUnits.set(set, names.size > MAX_SET_UNITS ? null : units);
}

// effect -> [{ units, ability? }]
const effectTargets = new Map();
const addTarget = (effect, target) => {
    if (!effectTargets.has(effect)) effectTargets.set(effect, []);
    effectTargets.get(effect).push(target);
};
for (const r of t("effect_bonus_value_ids_unit_sets")) {
    addTarget(r.effect, { units: setUnits.get(r.unit_set) });
}
for (const r of t("effect_bonus_value_unit_record_junctions")) {
    addTarget(r.effect, { units: [r.unit_record_key] });
}
const setAbility = new Map(t("unit_set_unit_ability_junctions").map((r) => [r.key, r]));
for (const r of t("effect_bonus_value_unit_set_unit_ability_junctions")) {
    const j = setAbility.get(r.unit_set_ability);
    if (j) addTarget(r.effect, { units: setUnits.get(j.unit_set), ability: j.unit_ability });
}
const setAttribute = new Map(t("unit_set_unit_attribute_junctions").map((r) => [r.key, r]));
for (const r of t("effect_bonus_value_unit_set_unit_attribute_junctions")) {
    const j = setAttribute.get(r.unit_set_attribute);
    if (j) addTarget(r.effect, { units: setUnits.get(j.unit_set) });
}

function formatValue(value, signed) {
    const n = Number(value);
    const s = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
    return signed && n >= 0 ? `+${s}` : s;
}

function effectText(effect, value) {
    let s = text(`effects_description_${effect}`);
    if (!s) return "";
    s = s.replace(/%\+n/g, formatValue(value, true)).replace(/%n/g, formatValue(value, false));
    return cleanText(s);
}

// --- skill trees ---
const subtypes = new Map(t("agent_subtypes").map((r) => [r.key, r]));
const setItems = by(t("character_skill_node_set_items"), "set");
const nodes = new Map(t("character_skill_nodes").map((r) => [r.key, r]));
const skillEffects = by(t("character_skill_level_to_effects_junctions"), "character_skill_key");
const factions = new Map(t("factions").map((r) => [r.key, r]));
const subcultures = new Map(t("cultures_subcultures").map((r) => [r.subculture, r]));
const nodeSetsBySubtype = by(t("character_skill_node_sets"), "agent_subtype_key");

// Skills in the trees of generic lords (e.g. a plain Dwarf Lord) are the shared
// race lines, not the legendary lord's own.
const uniqueAgentKeys = new Set(t("unique_agents").map((r) => r.agent_subtype));
const leaderKeys = new Set(t("frontend_faction_leaders").map((r) => r.agent_subtype_record));
const isLegendary = (key) => leaderKeys.has(key) || uniqueAgentKeys.has(key) || subtypes.get(key)?.recruitment_category === "legendary_lords";
const genericSkills = new Set();
for (const set of t("character_skill_node_sets")) {
    const key = set.agent_subtype_key;
    if (!key || set.agent_key !== "general" || isLegendary(key)) continue;
    for (const item of setItems.get(set.key) ?? []) {
        const node = nodes.get(item.item);
        if (node) genericSkills.add(node.character_skill_key);
    }
}

function lordUnitBuffs(subtype, faction) {
    const own = new Set();
    const assoc = subtypes.get(subtype)?.associated_unit_override;
    if (assoc) own.add(assoc);
    const ownName = assoc ? unitName(assoc) : "";
    const subculture = factions.get(faction)?.subculture;

    const skills = new Set();
    for (const set of nodeSetsBySubtype.get(subtype) ?? []) {
        if (set.faction_key && set.faction_key !== faction) continue;
        if (set.subculture && set.subculture !== subculture) continue;
        for (const item of setItems.get(set.key) ?? []) {
            const node = nodes.get(item.item);
            if (!node || node.visible_in_ui === "false") continue;
            if (node.faction_key && node.faction_key !== faction) continue;
            if (node.subculture && node.subculture !== subculture) continue;
            if (allSkills || !genericSkills.has(node.character_skill_key)) skills.add(node.character_skill_key);
        }
    }

    const byUnit = new Map();
    for (const skill of skills) {
        const skillName = cleanText(text(`character_skills_localised_name_${skill}`));
        if (!skillName) continue;
        // Highest rank of each effect wins; most skills only have one rank.
        const top = new Map();
        for (const e of skillEffects.get(skill) ?? []) {
            const prev = top.get(e.effect_key);
            if (!prev || Number(e.level) > Number(prev.level)) top.set(e.effect_key, e);
        }
        const maxLevel = Math.max(...[...top.values()].map((e) => Number(e.level)));
        for (const e of top.values()) {
            if (/enemy/.test(e.effect_scope)) continue; // debuffs on the enemy's units
            const targets = effectTargets.get(e.effect_key);
            if (!targets) continue;
            let effect = effectText(e.effect_key, e.value);
            if (!effect) continue;
            if (maxLevel > 1) effect += ` (rank ${e.level})`;
            for (const target of targets) {
                if (!target.units) continue;
                for (const unitKey of target.units) {
                    // Not the lord himself, nor other lords that happen to be in a set (heroes stay).
                    if (own.has(unitKey) || SKIP.test(unitKey) || mainUnits.get(unitKey)?.caste === "lord") continue;
                    const name = unitName(unitKey);
                    if (!name || name === ownName) continue;
                    if (!byUnit.has(name)) byUnit.set(name, []);
                    const buffs = byUnit.get(name);
                    if (!buffs.some((b) => b.skill === skillName && b.effect === effect)) buffs.push({ skill: skillName, effect });
                }
            }
        }
    }
    return [...byUnit.entries()]
        .map(([unit, buffs]) => ({ unit, buffs }))
        .sort((a, b) => a.unit.localeCompare(b.unit));
}

// --- legendary heroes ---
// A small reader for the Lua table literal in wh3_main_legendary_characters.lua.
function parseLuaTable(src, start) {
    let i = start;
    const ws = () => {
        for (;;) {
            while (i < src.length && /\s/.test(src[i])) i++;
            if (src.startsWith("--", i)) { while (i < src.length && src[i] !== "\n") i++; continue; }
            return;
        }
    };
    const value = () => {
        ws();
        if (src[i] === "{") return table();
        if (src[i] === '"' || src[i] === "'") {
            const q = src[i++]; let s = "";
            while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; s += src[i++]; }
            i++; return s;
        }
        const m = /^[^,}\s]+/.exec(src.slice(i, i + 200));
        i += m[0].length;
        const w = m[0];
        if (w === "true") return true;
        if (w === "false") return false;
        if (w === "nil") return null;
        if (!Number.isNaN(Number(w))) return Number(w);
        return { expr: w };
    };
    const table = () => {
        i++; // {
        const obj = {}; const arr = [];
        for (;;) {
            ws();
            if (src[i] === "}") { i++; break; }
            let key = null;
            if (src[i] === "[") {
                i++; key = value(); ws(); i++; ws(); i++; // ] =
            } else {
                const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/.exec(src.slice(i, i + 200));
                if (m) { key = m[1]; i += m[0].length; }
            }
            const v = value();
            if (key == null) arr.push(v); else obj[key] = v;
            ws();
            if (src[i] === "," || src[i] === ";") i++;
        }
        return arr.length && !Object.keys(obj).length ? arr : Object.keys(obj).length ? Object.assign(obj, arr.length ? { _list: arr } : {}) : [];
    };
    return value();
}

const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : typeof v === "string" ? [v] : Object.values(v).flatMap(asList));

const legendaryScript = scripts.find((f) => /wh3_main_legendary_characters\.lua$/i.test(f));
let characterData = {};
if (legendaryScript) {
    const src = fs.readFileSync(legendaryScript, "utf8");
    // The real assignment, not the examples in the header comment.
    const at = /^character_unlocking\.character_data\s*=\s*\{/m.exec(src);
    if (at) {
        try { characterData = parseLuaTable(src, src.indexOf("{", at.index)); }
        catch (e) { console.warn(`Could not read ${legendaryScript}: ${e.message}`); }
    }
    const count = Object.values(characterData).filter((c) => c?.subtype).length;
    console.log(`Read unlock data for ${count} legendary heroes from ${path.basename(legendaryScript)}.`);
} else {
    console.warn("No script/campaign/wh3_main_legendary_characters.lua in the export; hero unlocks will be unverified.");
}

const uniqueAgents = new Map(t("unique_agents").map((r) => [r.agent_subtype, r]));
const permitted = by(t("faction_agent_permitted_subtypes"), "faction");

function heroName(subtype) {
    const ua = uniqueAgents.get(subtype);
    if (ua) {
        const parts = [ua.forename, ua.surname].map((id) => cleanText(text(`names_name_${id}`))).filter(Boolean);
        if (parts.length) return parts.join(" ");
    }
    const assoc = subtypes.get(subtype)?.associated_unit_override;
    return assoc ? unitName(assoc) : "";
}

function heroType(subtype, fallback) {
    const assoc = subtypes.get(subtype)?.associated_unit_override;
    const mu = assoc && mainUnits.get(assoc);
    const generic = cleanText(text(`agent_subtypes_onscreen_name_override_${subtype}`));
    if (generic && !/^legendary (lord|hero)$/i.test(generic)) return generic;
    return { champion: "Champion", wizard: "Wizard", spy: "Spy", engineer: "Engineer", dignitary: "Dignitary",
        runesmith: "Runesmith" }[uniqueAgents.get(subtype)?.agent_type] ?? fallback ?? (mu?.caste === "hero" ? "Hero" : "Legendary Hero");
}

const missionTitle = (key) => cleanText(text(`missions_localised_title_${key}`));
const ritualName = (key) => cleanText(text(`rituals_display_name_${key}`)) || key;

// Mission key for a faction: a string, a list, {faction: key} or {faction: {campaign: key}}.
function missionsFor(keys, faction) {
    if (keys == null) return [];
    if (typeof keys === "string") return [{ key: keys }];
    if (Array.isArray(keys)) return keys.filter((k) => typeof k === "string").map((key) => ({ key }));
    const own = keys[faction];
    if (own == null) return [];
    if (typeof own === "string") return [{ key: own }];
    return Object.entries(own).map(([campaign, key]) => ({ key, campaign }));
}

function allowedCampaigns(info, faction, culture) {
    if (info.starting_owner_faction === faction) return [null];
    const o = info.override_allowed_factions;
    if (o) {
        if (Array.isArray(o)) return o.includes(faction) ? [null] : [];
        return Object.entries(o).filter(([, list]) => asList(list).includes(faction)).map(([c]) => c);
    }
    return asList(info.allowed_cultures).includes(culture) ? [null] : [];
}

function scriptedHero(info, faction, culture) {
    const campaigns = allowedCampaigns(info, faction, culture);
    if (!campaigns.length) return null;
    const subtype = info.subtype;
    const names = [heroName(subtype), info.additional_subtype && heroName(info.additional_subtype)].filter(Boolean);
    if (!names.length) return null;

    const parts = [];
    if (info.starting_owner_faction === faction) {
        parts.push("Starts with you when you begin a new campaign as this faction.");
    } else {
        const missions = missionsFor(info.starting_mission_keys, faction);
        const titles = [...new Set(missions.map((m) => missionTitle(m.key)).filter(Boolean))];
        const mission = titles.length ? `the mission "${titles.join('" / "')}"` : "a mission";
        if (info.unlock_rank != null) {
            const rank = info.priority_faction === faction ? 2 : info.unlock_rank;
            parts.push(`You are given ${mission} once your faction leader reaches rank ${rank}.`);
        } else if (info.ritual_keys) {
            const rituals = [...new Set(asList(info.ritual_keys).map(ritualName))];
            parts.push(`Unlocks after you perform one of these rituals: ${rituals.join(", ")}.`);
        } else if (info.required_buildings) {
            parts.push("Unlocks when you complete a specific building.");
        } else if (missions.length) {
            parts.push(`Unlocks when you complete ${mission}.`);
        }
        if (info.final_mission_key) {
            const last = missionTitle(info.final_mission_key);
            parts.push(`The hero joins after the last mission in the chain${last ? ` ("${last}")` : ""}.`);
        }
        if (info.trigger_dilemma_key) parts.push("A dilemma at the end decides whether they join.");
    }
    const camps = campaigns.filter(Boolean);
    if (camps.length && camps.length < Object.keys(CAMPAIGNS).length) {
        parts.push(`Only in ${camps.map((c) => CAMPAIGNS[c] ?? c).join(" and ")}.`);
    }
    if (info.require_dlc) {
        const dlcs = asList(info.require_dlc);
        if (!dlcs.every((d) => /BASE_GAME/.test(d))) parts.push(`Needs DLC: ${dlcs.map(dlcName).join(" or ")}.`);
    }
    return { name: names.join(" & "), type: heroType(subtype), unlock: parts.join(" "), subtypes: [subtype, info.additional_subtype].filter(Boolean) };
}

const scriptTextCache = new Map();
function scriptsMentioning(subtype) {
    const hits = [];
    for (const f of scripts) {
        if (!scriptTextCache.has(f)) scriptTextCache.set(f, fs.readFileSync(f, "utf8"));
        if (scriptTextCache.get(f).includes(`"${subtype}"`)) hits.push(path.basename(f));
    }
    return hits;
}

function factionHeroes(faction) {
    const subculture = factions.get(faction)?.subculture;
    const culture = subcultures.get(subculture)?.culture;
    const heroes = [];
    const seen = new Set();
    for (const info of Object.values(characterData)) {
        if (!info || typeof info !== "object" || !info.subtype) continue;
        const hero = scriptedHero(info, faction, culture);
        if (!hero) continue;
        hero.subtypes.forEach((s) => seen.add(s));
        delete hero.subtypes;
        heroes.push(hero);
    }
    // Unique heroes the faction may hold but the unlock script doesn't cover.
    for (const p of permitted.get(faction) ?? []) {
        if (p.agent === "general" || p.agent === "colonel" || seen.has(p.subtype) || !uniqueAgents.has(p.subtype)) continue;
        seen.add(p.subtype);
        const name = heroName(p.subtype);
        if (!name) continue;
        const files = scriptsMentioning(p.subtype);
        heroes.push({
            name, type: heroType(p.subtype),
            unlock: files.length
                ? "Joins through a campaign event; the game data doesn't say exactly how."
                : "This faction is allowed this hero, but no unlock condition was found in the game data.",
            scripts: files,
            unverified: true,
        });
    }
    return heroes.sort((a, b) => (a.unverified ? 1 : 0) - (b.unverified ? 1 : 0) || a.name.localeCompare(b.name));
}

// --- match the app's lords ---
// Game names carry titles ("Emperor Karl Franz", "Tzarina Katarin"), so a lord
// matches when one name's words all appear in the other's.
const STOP = new Set(["the", "of", "a"]);
const words = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ")
    .trim().split(" ").filter((w) => w && !STOP.has(w));
const RACE_CODES = {
    Dwarfs: ["dwf"], Empire: ["emp"], Greenskins: ["grn"], "Vampire Counts": ["vmp"], Bretonnia: ["brt"],
    "Warriors of Chaos": ["chs", "kho", "nur", "sla", "tze"], Beastmen: ["bst"], "Wood Elves": ["wef"], Norsca: ["nor"],
    "High Elves": ["hef"], "Dark Elves": ["def"], Lizardmen: ["lzd"], Skaven: ["skv"], "Tomb Kings": ["tmb"],
    "Vampire Coast": ["cst"], Khorne: ["kho"], Nurgle: ["nur"], Slaanesh: ["sla"], Tzeentch: ["tze"],
    "Daemons of Chaos": ["dae"], Kislev: ["ksl"], "Grand Cathay": ["cth"], "Ogre Kingdoms": ["ogr"], "Chaos Dwarfs": ["chd"],
};
const SPECIAL = /chaos|_mp_|qb|invasion|_intro|prologue|rebel|separatist/;

const candidates = [];
for (const r of t("frontend_faction_leaders")) {
    if (!r.agent_subtype_record || !r.faction) continue;
    candidates.push({ subtype: r.agent_subtype_record, faction: r.faction, special: SPECIAL.test(r.key) });
}
const inFrontend = new Set(candidates.map((c) => c.subtype));
// Legendary lords nobody starts as (unlocked during a campaign): faction from their permissions, if any.
for (const sub of subtypes.values()) {
    if (inFrontend.has(sub.key) || sub.recruitment_category !== "legendary_lords" || !nodeSetsBySubtype.has(sub.key)) continue;
    const factionsFor = t("faction_agent_permitted_subtypes")
        .filter((p) => p.subtype === sub.key && p.agent === "general" && !SPECIAL.test(p.faction))
        .map((p) => p.faction);
    candidates.push({ subtype: sub.key, faction: factionsFor.length === 1 ? factionsFor[0] : null, special: false });
}
for (const c of candidates) c.words = words(heroName(c.subtype));

function findLord(lordName, race) {
    const want = words(lordName);
    if (!want.length) return null;
    const contains = (a, b) => a.every((w) => b.includes(w));
    let hits = candidates.filter((c) => c.words.length && want.join(" ") === c.words.join(" "));
    if (!hits.length) hits = candidates.filter((c) => c.words.length && (contains(want, c.words) || contains(c.words, want)));
    // Still nothing: the lord's own name (first word) alone, e.g. "Katarin the Ice Queen".
    if (!hits.length) hits = candidates.filter((c) => c.words.includes(want[0]));
    const codes = RACE_CODES[race];
    if (codes && new Set(hits.map((h) => h.subtype)).size > 1) {
        const sameRace = hits.filter((h) => h.subtype.split("_").some((p) => codes.includes(p)));
        if (sameRace.length) hits = sameRace;
    }
    if (new Set(hits.map((h) => h.subtype)).size !== 1) return null;
    return [...hits].sort((a, b) => a.special - b.special)[0];
}

const lords = {};
const unmatched = [];
const seenLord = new Set();
for (const row of readCsv(racesFile)) {
    if (!row.lordId || seenLord.has(row.lordId)) continue;
    seenLord.add(row.lordId);
    const hit = findLord(row.lordName, row.race);
    if (!hit) { unmatched.push(`${row.lordName} (${row.race})`); continue; }
    const lord = {
        name: row.lordName,
        gameName: heroName(hit.subtype),
        subtype: hit.subtype,
        faction: hit.faction,
        units: lordUnitBuffs(hit.subtype, hit.faction),
        heroes: hit.faction ? factionHeroes(hit.faction) : [],
    };
    if (!hit.faction) lord.note = "Not a starting lord, so there is no faction to list legendary heroes for.";
    lords[row.lordId] = lord;
}

fs.writeFileSync(outputFile, JSON.stringify({ format: "grudgekeeper-lord-details", version: 1, generated: new Date().toISOString(), lords }, null, 1));

console.log(`Wrote ${Object.keys(lords).length} lords to ${outputFile}.`);
if (unmatched.length) console.log(`No match in the game data for ${unmatched.length}: ${unmatched.join(", ")}`);
