import { createContext, useContext } from "react";

// Display face for titles and big numbers; the body stays in Palatino.
export const DISPLAY_FONT = "'Cinzel', 'Palatino Linotype', 'Book Antiqua', Palatino, serif";

export const DARK = {
    name: "dark",
    bg: "#0a0604",
    // Panels are lit from above: a faint warm sheen fading down into the card.
    bg2: "linear-gradient(180deg, rgba(38,24,12,0.92) 0%, rgba(20,12,6,0.92) 100%)",
    bg3: "linear-gradient(180deg, rgba(255,210,140,0.065) 0%, rgba(255,210,140,0.022) 60%, rgba(255,210,140,0.018) 100%)",
    altRow: "rgba(255,210,140,0.035)",
    border: "rgba(190,120,40,0.28)",
    borderHover: "rgba(220,160,60,0.45)",
    text1: "#f3e2b8",
    text2: "#d2b277",
    text3: "#b08c55",
    text4: "#8c6d3e",
    text5: "#90723f",
    accent: "#d9a21c",
    accentGlow: "rgba(217,162,28,0.14)",
    sidebar: "linear-gradient(180deg, rgba(22,12,5,0.88) 0%, rgba(10,5,2,0.9) 100%)",
    topbar: "rgba(6,3,1,0.55)",
    input: "rgba(255,200,80,0.05)",
    inputBorder: "rgba(180,110,30,0.32)",
    checkDone: "rgba(74,222,128,0.10)",
    checkBorder: "#4ade80",
};

export const LIGHT = {
    name: "light",
    bg: "#c9bfa9",
    bg2: "linear-gradient(180deg, rgba(232,222,200,0.95) 0%, rgba(208,197,174,0.95) 100%)",
    bg3: "linear-gradient(180deg, rgba(255,248,228,0.30) 0%, rgba(255,248,228,0.12) 100%)",
    altRow: "rgba(255,250,235,0.16)",
    border: "rgba(110,75,15,0.24)",
    borderHover: "rgba(140,100,10,0.42)",
    text1: "#140d04",
    text2: "#2b1c0a",
    text3: "#433014",
    text4: "#5a3f1e",
    text5: "#6a4e28",
    accent: "#a8700a",
    accentGlow: "rgba(168,112,10,0.14)",
    sidebar: "linear-gradient(180deg, rgba(190,178,154,0.92) 0%, rgba(172,160,138,0.92) 100%)",
    topbar: "rgba(178,168,154,0.80)",
    input: "rgba(255,250,235,0.35)",
    inputBorder: "rgba(110,75,15,0.26)",
    checkDone: "rgba(122,180,60,0.14)",
    checkBorder: "#5a8a20",
};

export const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);
