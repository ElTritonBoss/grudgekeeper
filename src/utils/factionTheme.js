// Re-tints the base theme to the active lord's crest colours, so the whole app
// takes on that faction's look: the primary colour drives the accent, borders
// and background; the secondary colour (often the crest's metal) is used for
// highlights. Crest colours vary a lot in brightness, so only hue and some
// saturation are kept; lightness is set here so text stays readable.

function hexToHsl(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    if (!d) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map((v) => Math.round((v + m) * 255));
}

const hex = (h, s, l) => "#" + hslToRgb(h, s, l).map((v) => v.toString(16).padStart(2, "0")).join("");
const rgba = (h, s, l, a) => `rgba(${hslToRgb(h, s, l).join(",")},${a})`;
const rgb = (h, s, l) => hslToRgb(h, s, l).join(",");

export default function factionTheme(base, color, color2) {
    const hsl = hexToHsl(color);
    if (!hsl) return { ...base, accentRgb: base.name === "dark" ? "217,162,28" : "168,112,10", accent2: base.accent };
    const { h } = hsl;
    const s = Math.min(Math.max(hsl.s, 0.45), 0.85);
    // Secondary: the crest's other colour, or crest gold when it has none.
    const h2s = hexToHsl(color2) ?? { h: 44, s: 0.7 };
    const s2 = Math.min(Math.max(h2s.s, 0.4), 0.85);
    const accent2 = base.name === "dark" ? hex(h2s.h, s2, h2s.s < 0.15 ? 0.8 : 0.62) : hex(h2s.h, s2, 0.34);

    if (base.name === "dark") {
        return {
            ...base,
            faction: true,
            bg: hex(h, 0.45, 0.035),
            bg2: `linear-gradient(180deg, ${rgba(h, s * 0.55, 0.11, 0.92)} 0%, ${rgba(h, s * 0.5, 0.055, 0.92)} 100%)`,
            bg3: `linear-gradient(180deg, ${rgba(h, s, 0.75, 0.06)} 0%, ${rgba(h, s, 0.75, 0.022)} 60%, ${rgba(h, s, 0.75, 0.018)} 100%)`,
            altRow: rgba(h, s, 0.75, 0.035),
            border: rgba(h, s, 0.45, 0.32),
            borderHover: rgba(h, s, 0.6, 0.5),
            text2: hex(h, 0.4, 0.68),
            text3: hex(h, 0.3, 0.55),
            text4: hex(h, 0.25, 0.42),
            text5: hex(h, 0.25, 0.44),
            accent: hex(h, s, 0.58),
            accentRgb: rgb(h, s, 0.58),
            accentGlow: rgba(h, s, 0.58, 0.15),
            sidebar: `linear-gradient(180deg, ${rgba(h, s * 0.6, 0.075, 0.9)} 0%, ${rgba(h, s * 0.5, 0.03, 0.92)} 100%)`,
            input: rgba(h, s, 0.6, 0.05),
            inputBorder: rgba(h, s, 0.45, 0.35),
            glowA: rgba(h, s, 0.35, 0.22),
            glowB: rgba(h, s, 0.25, 0.16),
            sheen: rgba(h, s, 0.8, 0.9),
            accent2,
        };
    }
    return {
        ...base,
        faction: true,
        bg: hex(h, 0.22, 0.76),
        border: rgba(h, s, 0.3, 0.26),
        borderHover: rgba(h, s, 0.3, 0.45),
        text4: hex(h, 0.4, 0.28),
        accent: hex(h, s, 0.36),
        accentRgb: rgb(h, s, 0.36),
        accentGlow: rgba(h, s, 0.36, 0.14),
        sidebar: `linear-gradient(180deg, ${rgba(h, 0.22, 0.72, 0.92)} 0%, ${rgba(h, 0.2, 0.66, 0.92)} 100%)`,
        inputBorder: rgba(h, s, 0.3, 0.28),
        glowA: rgba(h, s, 0.6, 0.18),
        glowB: rgba(h, s, 0.5, 0.1),
        sheen: rgba(h, s, 0.3, 1),
        accent2,
    };
}
