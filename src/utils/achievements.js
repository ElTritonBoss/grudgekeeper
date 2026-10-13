import { useEffect } from "react";
import { isDone, getVictory, getKills, VICTORIES } from "./constants";

export const ACHIEVEMENTS_KEY = "tww3_achievements";

// Achievement rules. Everything except "manual" is tracked from saved progress.
//   manual  – ticked by hand
//   lord    – finish one lord (optionally with a given victory or better)
//   faction – finish every lord of a faction
//   count   – finish N campaigns (optionally with a given victory or better)
//   kills   – slay N lords in total across finished campaigns
export const RULES = [
    { id: "count", label: "Finish a number of campaigns" },
    { id: "lord", label: "Finish a specific lord" },
    { id: "faction", label: "Finish every lord of a faction" },
    { id: "kills", label: "Slay a number of lords in total" },
    { id: "manual", label: "Tick it off myself" },
];

export const ICONS = ["🏆", "⚔️", "🛡️", "👑", "💀", "🔥", "📜", "🍺", "⚒️", "🐉", "🌟", "🎯"];

export const PRESETS = [
    { icon: "⚔️", title: "First Blood", rule: "count", count: 1 },
    { icon: "📜", title: "Grudges Settled", rule: "faction", target: "dwarfs" },
    { icon: "👑", title: "Ultimate Ruler", rule: "count", count: 5, victory: "Ultimate" },
    { icon: "💀", title: "Kingslayer", rule: "kills", count: 100 },
    { icon: "🌟", title: "Halfway There", rule: "count", count: 55 },
];

const victoryOk = (val, min) => !min || VICTORIES.indexOf(getVictory(val)) >= VICTORIES.indexOf(min);

// { have, need } for an achievement against the current progress.
export function achievementProgress(a, campaigns, checked) {
    const done = campaigns.filter((c) => isDone(checked[c.lordId]));
    switch (a.rule) {
        case "lord": {
            const val = checked[a.target];
            return { have: isDone(val) && victoryOk(val, a.victory) ? 1 : 0, need: 1 };
        }
        case "faction": {
            const lords = campaigns.filter((c) => c.factionId === a.target);
            return { have: lords.filter((c) => isDone(checked[c.lordId])).length, need: lords.length || 1 };
        }
        case "count":
            return { have: done.filter((c) => victoryOk(checked[c.lordId], a.victory)).length, need: a.count || 1 };
        case "kills":
            return { have: done.reduce((sum, c) => sum + (getKills(checked[c.lordId]) ?? 0), 0), need: a.count || 1 };
        default:
            return { have: a.manualDone ? 1 : 0, need: 1 };
    }
}

export const isEarned = (p) => p.have >= p.need;

// Plain-English description of the rule, e.g. "Finish 5 campaigns with an Ultimate victory".
export function describe(a, campaigns) {
    const vic = a.victory ? ` with a ${a.victory}${a.victory !== "Ultimate" ? " or better" : ""} victory` : "";
    switch (a.rule) {
        case "lord": {
            const c = campaigns.find((x) => x.lordId === a.target);
            return `Finish a campaign as ${c ? `${c.lord} (${c.faction})` : "a lord"}${vic}`;
        }
        case "faction": {
            const c = campaigns.find((x) => x.factionId === a.target);
            const n = campaigns.filter((x) => x.factionId === a.target).length;
            return `Finish all ${n} ${c?.faction ?? ""} lords`;
        }
        case "count": return `Finish ${a.count} ${a.count === 1 ? "campaign" : "campaigns"}${vic}`;
        case "kills": return `Slay ${a.count} enemy lords across your finished campaigns`;
        default: return a.note || "Tick this off yourself when you've done it";
    }
}

// Stamp the date an achievement was first earned (and clear it if progress is undone).
// Returns how many are earned right now.
export function useAchievementStamps(achievements, setAchievements, campaigns, checked) {
    const state = achievements.map((a) => isEarned(achievementProgress(a, campaigns, checked)));
    const key = state.join(",");
    useEffect(() => {
        if (!campaigns.length) return;
        const stale = achievements.some((a, i) => !!a.earnedAt !== state[i]);
        if (stale) setAchievements(achievements.map((a, i) => ({ ...a, earnedAt: state[i] ? a.earnedAt ?? Date.now() : null })));
    }, [key, campaigns.length]);
    return state.filter(Boolean).length;
}
