// Race-specific ornament drawn along the top of the sidebar and the main area
// while a campaign is active. Only Dwarfs have one so far: the stepped,
// interlocking key pattern carved round Dwarf doors, shields and runestones.
const DWARF_BAND = (
    <>
        <path d="M0 3h6v6h6V3h6v10H0" fill="none" />
        <path d="M18 13h6V7h6v6h6V3" fill="none" />
        <rect x="0" y="0.5" width="36" height="0.9" stroke="none" />
        <rect x="0" y="14.6" width="36" height="0.9" stroke="none" />
    </>
);

const MOTIFS = { Dwarfs: DWARF_BAND };

export const hasMotif = (race) => Boolean(MOTIFS[race]);

export default function Motif({ race, color, opacity = 0.55, height = 16 }) {
    const band = MOTIFS[race];
    if (!band) return null;
    const id = `gk-motif-${race}`;
    return (
        <svg width="100%" height={height} style={{ display: "block", opacity }} aria-hidden="true">
            <defs>
                <pattern id={id} width="36" height="16" patternUnits="userSpaceOnUse">
                    <g stroke={color} fill={color} strokeWidth="1.4" strokeLinejoin="miter">{band}</g>
                </pattern>
            </defs>
            <rect width="100%" height={height} fill={`url(#${id})`} />
        </svg>
    );
}
