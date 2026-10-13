import { useState, useEffect } from "react";
import Papa from "papaparse";
import { isDone, TIERS, tierFor } from "../utils/constants";
import { lordOwned, lordPack, lordLabel } from "../utils/dlc";

export default function useCSV(path) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(path)
            .then((response) => response.text())
            .then((text) => {
                const result = Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                });
                setData(result.data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [path]);

    return { data, loading, error };
}

export function buildStyles(csvRows) {
    const map = {};
    csvRows.forEach((row) => {
        map[row.id] = {
            id: row.id,
            label: row.label,
            icon: row.icon,
            color: row.color,
        };
    });
    return map;
}

// One campaign per legendary lord: faction-level text from roadmap.csv,
// lord-level queue position, difficulty and notes from races.csv.
// dlc = { products, requirements, owned } marks lords the player can't play yet.
export function buildCampaigns(roadmapRows, raceRows, stylesMap = {}, dlc = null) {
    const factions = {};
    roadmapRows.forEach((row) => { factions[row.race] = row; });

    const campaigns = raceRows.filter((r) => factions[r.race]).map((r) => {
        const f = factions[r.race];
        const styleIds = f.style ? f.style.split(";").map(s => s.trim()) : [];
        const styles = styleIds.map(id => stylesMap[id] ?? { id, label: id, icon: "", color: null });
        const difficulty = parseInt(r.difficulty, 10) || 1;
        return {
            ...f,
            factionId: f.id,
            id: r.lordId,
            lordId: r.lordId,
            lord: r.lordName,
            dlc: r.lorddlc,
            owned: dlc ? lordOwned(dlc.requirements, dlc.owned, r.lordId) : true,
            pack: dlc ? lordPack(dlc.requirements, dlc.products, r.lordId) ?? r.lorddlc : r.lorddlc,
            dlcLabel: dlc ? lordLabel(dlc.requirements, dlc.products, r.lordId, r.lorddlc) : r.lorddlc,
            raceColor: r.color,
            // Primary and secondary colour of the lord's own faction crest (from the game's flag art).
            crest: r.crest ? r.crest.split(";").map((c) => c.trim()).filter(Boolean) : [],
            icon: r.icon,
            queue: parseInt(r.queue, 10) || 99,
            difficulty,
            isNew: r.isNew === "1",
            note: r.note,
            tags: f.tags ? f.tags.split(";").map((t) => t.trim()) : [],
            length: f.length?.trim(),
            pressure: f.pressure?.trim(),
            game: f.game?.trim(),
            styleIds,
            styles,
            styleLabel: styles.map(s => s.label).join(" / "),
            styleIcon: styles[0]?.icon ?? "",
            ...tierFor(difficulty),
        };
    });

    const order = roadmapRows.map((row) => row.id);
    return campaigns.sort((a, b) => order.indexOf(a.factionId) - order.indexOf(b.factionId) || a.queue - b.queue);
}

// One card per faction, showing the first lord in its queue that isn't done yet
// and whose DLC is owned. The card sits in the tier matching that lord's difficulty.
// When only unowned lords are left, the card is shown locked (needsDlc).
export function buildRoadmap(campaigns, progress = {}) {
    const byFaction = {};
    campaigns.forEach((c) => { (byFaction[c.factionId] ??= []).push(c); });

    const cards = Object.values(byFaction).map((lords) => {
        const open = lords.filter((l) => !isDone(progress[l.lordId]));
        const next = open.find((l) => l.owned);
        const current = next ?? open[0] ?? lords[lords.length - 1];
        return {
            ...current,
            factionLords: lords,
            doneCount: lords.length - open.length,
            complete: open.length === 0,
            needsDlc: open.length > 0 && !next,
        };
    });

    return TIERS.map((t) => ({
        ...t,
        entries: cards.filter((c) => c.tier === t.tier).sort((a, b) => a.complete - b.complete || a.needsDlc - b.needsDlc),
    }));
}

export function buildRaces(csvRows) {
    const raceMap = {};

    csvRows.forEach((row) => {
        if (!raceMap[row.race]) {
            raceMap[row.race] = {
                race: row.race,
                icon: row.icon,
                game: row.game,
                color: row.color,
                lords: [],
            };
        }

        raceMap[row.race].lords.push({
            id: row.lordId,
            name: row.lordName,
            dlc: row.lorddlc,
        });
    });

    return Object.values(raceMap);
}