export function isDone(val) {
    return val?.done === true;
}

export function getVictory(val) {
    return val?.victory ?? null;
}

export function getKills(val) {
    return val?.kills ?? null;
}

export const VICTORIES = ["Short", "Long", "Ultimate"];
export const VICTORY_COLORS = { Short: "#facc15", Long: "#4ade80", Ultimate: "#c084fc" };

export const TIERS = [
    { tier: 1, tierLabel: "BEGINNER", tierColor: "#4ade80" },
    { tier: 2, tierLabel: "INTERMEDIATE", tierColor: "#facc15" },
    { tier: 3, tierLabel: "ADVANCED", tierColor: "#f97316" },
    { tier: 4, tierLabel: "VETERAN", tierColor: "#c084fc" },
    { tier: 5, tierLabel: "LEGENDARY", tierColor: "#ef4444" },
].map((t) => ({ ...t, tierBg: `${t.tierColor}14` }));

export function tierFor(difficulty) {
    const d = Math.min(5, Math.max(1, difficulty || 1));
    return TIERS[d - 1];
}
