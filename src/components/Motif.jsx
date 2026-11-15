// Race-specific ornament drawn along the top of the sidebar and the main area
// while a campaign is active. Dwarfs get the stepped, interlocking key pattern
// carved round Dwarf doors, shields and runestones; Greenskins get a row of
// crude fangs between two rough-cut bars, like the teeth daubed on Orc shields.
const DWARF_BAND = (
    <>
        <path d="M0 3h6v6h6V3h6v10H0" fill="none" />
        <path d="M18 13h6V7h6v6h6V3" fill="none" />
        <rect x="0" y="0.5" width="36" height="0.9" stroke="none" />
        <rect x="0" y="14.6" width="36" height="0.9" stroke="none" />
    </>
);

const GREENSKIN_BAND = (
    <>
        <path d="M0 2.5h36" fill="none" />
        <path d="M0 13.5h36" fill="none" />
        <path d="M2 3l3 7 3-7M11 3l4 9 4-9M22 3l3 7 3-7" stroke="none" />
        <path d="M30 13l3-5 3 5" stroke="none" />
    </>
);

const MOTIFS = { Dwarfs: DWARF_BAND, Greenskins: GREENSKIN_BAND };

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
