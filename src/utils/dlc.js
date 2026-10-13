// DLC ownership. Each lord needs one of the products listed for it in lord-dlc.csv
// (SEGA's Immortal Empires ownership guide). Ownership is saved as { productId: false }
// for packs the player doesn't own, so everything counts as owned until unticked.

export const OWNED_KEY = "tww3_ownedDlc";

export function buildProducts(rows) {
    return rows.map((r) => ({ id: r.id, name: r.name, game: r.game, kind: r.kind }));
}

export function buildRequirements(rows) {
    const map = {};
    rows.forEach((r) => { map[r.lordId] = r.requires.split(";").map((s) => s.trim()).filter(Boolean); });
    return map;
}

export const ownsProduct = (owned, id) => owned[id] !== false;

// A lord is playable when any one of its required products is owned.
export function lordOwned(requirements, owned, lordId) {
    const req = requirements[lordId];
    return !req?.length || req.some((id) => ownsProduct(owned, id));
}

// The pack name to show for a lord: its own DLC, or the base game when it needs nothing else.
export function lordPack(requirements, products, lordId) {
    const req = requirements[lordId] ?? [];
    const names = Object.fromEntries(products.map((p) => [p.id, p.name]));
    const dlc = req.find((id) => !/^wh\d$/.test(id));
    const base = req.find((id) => /^wh\d$/.test(id));
    return names[base ?? dlc] ?? null;
}

// Label for the lord's pack on cards. Old data only says "DLC" for many lords; lords that
// also come with a base game were free (FLC), the rest show their pack's name.
export function lordLabel(requirements, products, lordId, csvLabel) {
    if (csvLabel !== "DLC") return csvLabel;
    const req = requirements[lordId] ?? [];
    if (req.some((id) => /^wh\d$/.test(id))) return "FLC";
    return lordPack(requirements, products, lordId) ?? csvLabel;
}
