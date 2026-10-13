import { load, save } from "../hooks/usePersist";

// Progress used to be saved per roadmap slot ("tier-index"). These are the slots
// of the old 29-row roadmap, mapped to the lord each slot represented.
const OLD_SLOTS = {
    "1-0": "thorgrim", "1-1": "karlfranz", "1-2": "grimgor", "1-3": "louen", "1-4": "wulfrik",
    "2-0": "mannfred", "2-1": "tyrion", "2-2": "kroq", "2-3": "khazrak", "2-4": "orion", "2-5": "settra", "2-6": "luthor",
    "3-0": "ikitclaw", "3-1": "lokhir", "3-2": "miao_ying", "3-3": "skarbrand", "3-4": "kugath", "3-5": "kairos", "3-6": "greasus",
    "4-0": "astragoth", "4-1": "katarin", "4-2": "archaon", "4-3": "nkari", "4-4": "daemonprince",
    "5-0": "dechala", "5-1": "sayl", "5-2": "aislinn", "5-3": "nagash", "5-4": "neferata",
};

// The active campaign used to be stored as the old roadmap row id.
const OLD_ACTIVE = {
    dwarfs: "thorgrim", empire: "karlfranz", greenskins: "grimgor", bretonnia: "louen", norsca: "wulfrik",
    vc: "mannfred", highelves: "tyrion", lizardmen: "kroq", beastmen: "khazrak", woodelves: "orion", tombkings: "settra", vampirecoast: "luthor",
    skaven: "ikitclaw", darkelves: "lokhir", cathay: "miao_ying", khorne: "skarbrand", nurgle: "kugath", tzeentch: "kairos", ogrekingdoms: "greasus",
    chaosdwarfs: "astragoth", kislev: "katarin", woc: "archaon", slaanesh: "nkari", daemonprince: "daemonprince",
};

export const PROGRESS_KEY = "tww3_progress";

// One-time move of old slot-based progress to per-lord progress.
// The old "tww3_checked" save is left untouched as a backup.
export function migrateProgress() {
    if (load(PROGRESS_KEY, null) === null) {
        const old = load("tww3_checked", {});
        const progress = {};
        Object.entries(old).forEach(([slot, val]) => {
            const lordId = OLD_SLOTS[slot];
            if (!lordId || val == null) return;
            progress[lordId] = typeof val === "object" ? val : { done: !!val, victory: null };
        });
        save(PROGRESS_KEY, progress);
    }
    const active = load("tww3_activeCampaign", null);
    if (active && OLD_ACTIVE[active]) save("tww3_activeCampaign", OLD_ACTIVE[active]);
}
