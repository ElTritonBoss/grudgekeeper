// Parses a campaign log written by the logger mod (mod/grudgekeeper_logger):
// one JSON object per line. See docs/campaign-logger.md for the format.

const RESULT_LABELS = {
    heroic_victory: "Heroic victory",
    decisive_victory: "Decisive victory",
    close_victory: "Close victory",
    pyrrhic_victory: "Pyrrhic victory",
    valiant_defeat: "Valiant defeat",
    close_defeat: "Close defeat",
    decisive_defeat: "Decisive defeat",
    crushing_defeat: "Crushing defeat",
};

export function resultLabel(result) {
    return RESULT_LABELS[result] ?? (result ? result.replace(/_/g, " ") : "Unknown result");
}

export function isVictory(result) {
    return typeof result === "string" && result.endsWith("_victory");
}

// Turns the raw log text into a campaign summary. Events logged after a save
// point are dropped when that save is loaded again, so a reload doesn't leave
// battles that "never happened" in the timeline.
export function parseCampaignLog(text) {
    let events = [];
    const unitNames = {};
    let start = null;
    let lastLoad = null;

    for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        let e;
        try { e = JSON.parse(line); } catch (_) { continue; } // a line still being written
        if (e.t === "unit_names") { Object.assign(unitNames, e.names); continue; }
        if (e.t === "load") {
            events = events.filter((x) => x.n <= e.n);
            lastLoad = e;
            continue;
        }
        if (e.t === "start") start = e;
        events.push(e);
    }

    // A lord can show up as both created and recruited; keep the first.
    const seen = new Set();
    events = events.filter((e) => {
        if (e.t !== "recruit" && e.t !== "character_created") return true;
        const cqi = e.character?.cqi;
        if (cqi == null) return true;
        if (seen.has(cqi)) return false;
        seen.add(cqi);
        return true;
    });

    const battles = events.filter((e) => e.t === "battle");
    const playerSide = (b) => b[b.player_side] ?? {};
    const enemySide = (b) => b[b.player_side === "attacker" ? "defender" : "attacker"] ?? {};
    const won = battles.filter((b) => isVictory(playerSide(b).result));
    const lastTurn = [...events].reverse().find((e) => e.t === "turn");
    const latest = events[events.length - 1];

    return {
        id: start?.campaign ?? latest?.campaign ?? null,
        faction: start?.faction ?? null,
        factionName: start?.faction_name ?? start?.faction ?? null,
        leader: start?.leader ?? null,
        startedAt: start?.at ?? null,
        turn: Math.max(latest?.turn ?? 0, lastLoad?.turn ?? 0) || null,
        lastActivity: latest?.at ?? null,
        events,
        unitNames,
        armies: lastTurn?.armies ?? [],
        stats: {
            battles: battles.length,
            won: won.length,
            lost: battles.length - won.length,
            heroic: battles.filter((b) => playerSide(b).result === "heroic_victory").length,
            kills: battles.reduce((sum, b) => sum + (playerSide(b).kills ?? 0), 0),
            losses: battles.reduce((sum, b) => sum + (playerSide(b).casualties ?? 0), 0),
            enemyLords: new Set(battles.flatMap((b) => (enemySide(b).armies ?? []).map((a) => a.lord?.cqi)).filter((c) => c != null)).size,
            regionsGained: events.filter((e) => e.t === "region_gained").length,
            regionsLost: events.filter((e) => e.t === "region_lost").length,
            recruited: events.filter((e) => e.t === "recruit" || e.t === "character_created").length,
        },
        playerSide,
        enemySide,
    };
}

export function unitName(unitNames, key) {
    const name = unitNames[key];
    return name && name !== key ? name : key.replace(/^wh\d?_(main|dlc\d+|pro\d+|twa\d+)_/, "").replace(/_/g, " ");
}

// "Longbeards ×2, Cannon" style summary of a list of unit keys.
export function summariseUnits(unitNames, keys) {
    const counts = new Map();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return [...counts].map(([key, n]) => (n > 1 ? `${unitName(unitNames, key)} ×${n}` : unitName(unitNames, key)));
}
