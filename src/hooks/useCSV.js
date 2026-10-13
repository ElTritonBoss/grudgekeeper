import { useState, useEffect } from "react";
import Papa from "papaparse";
import { isDone, TIERS, tierFor } from "../utils/constants";

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
export function buildCampaigns(roadmapRows, raceRows, stylesMap = {}) {
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
            raceColor: r.color,
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

// One card per faction, showing the first lord in its queue that isn't done yet.
// The card sits in the tier matching that lord's difficulty.
export function buildRoadmap(campaigns, progress = {}) {
    const byFaction = {};
    campaigns.forEach((c) => { (byFaction[c.factionId] ??= []).push(c); });

    const cards = Object.values(byFaction).map((lords) => {
        const next = lords.find((l) => !isDone(progress[l.lordId]));
        const current = next ?? lords[lords.length - 1];
        return {
            ...current,
            factionLords: lords,
            doneCount: lords.filter((l) => isDone(progress[l.lordId])).length,
            complete: !next,
        };
    });

    return TIERS.map((t) => ({
        ...t,
        entries: cards.filter((c) => c.tier === t.tier).sort((a, b) => a.complete - b.complete),
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