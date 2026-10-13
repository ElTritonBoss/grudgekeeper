// Line icons for the sidebar, drawn to match each other. Anything without a
// drawing here (a new view's emoji, say) is shown as plain text instead.
const PATHS = {
    dashboard: <><path d="M12 3 4 7v5c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V7l-8-4Z" /><path d="M12 8v8M8.5 11.5h7" /></>,
    roadmap: <><path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20V6.5Z" /><path d="M9 4v13.5M15 6.5V20" /></>,
    allfactions: <><path d="M5 5h14M5 12h14M5 19h14" /><circle cx="3" cy="5" r=".6" /><circle cx="3" cy="12" r=".6" /><circle cx="3" cy="19" r=".6" /></>,
    browser: <><path d="m5 19 9.5-9.5M14.5 4.5l5 5-2 2-5-5 2-2Z" /><path d="M19 19 9.5 9.5M9.5 4.5l-5 5 2 2 5-5-2-2Z" /></>,
    mylist: <><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 4V2.5h6V4M8.5 10l1.5 1.5L13 8.5M8.5 16h7" /></>,
    notes: <><path d="M15.5 4.5 19.5 8.5 9 19H5v-4L15.5 4.5Z" /><path d="M13 7l4 4" /></>,
    statistics: <><path d="M4 20h16" /><path d="M6.5 20v-6M11 20V9M15.5 20v-8M20 20V5" /></>,
    achievements: <><circle cx="12" cy="14.5" r="5.5" /><path d="M8.5 3h7l-2 6.5h-3L8.5 3Z" /><path d="m12 12 .9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3L12 12Z" /></>,
    compare: <><path d="M12 4v16M7 20h10M5 7h14" /><path d="M5 7 2.5 13a2.5 2.5 0 0 0 5 0L5 7ZM19 7l-2.5 6a2.5 2.5 0 0 0 5 0L19 7Z" /></>,
    dlc: <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9M16 16l2-2M18.5 18.5l2-2" /></>,
    units: <><path d="M7 4h11a2 2 0 0 1 2 2v1h-3" /><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2" /><path d="M8.5 9h6M8.5 12.5h6M8.5 16h4" /></>,
};

export default function NavIcon({ id, fallback, size = 18 }) {
    const p = PATHS[id];
    if (!p) return <span style={{ fontSize: size * 0.85, width: size, textAlign: "center", lineHeight: 1 }}>{fallback}</span>;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {p}
        </svg>
    );
}

// The Grudgekeeper mark: a rune-carved shield with a crossed hammer.
export function Emblem({ size = 44, color, highlight = "#f6d77a" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
            <defs>
                <linearGradient id="gk-gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={highlight} />
                    <stop offset="0.55" stopColor={color} />
                    <stop offset="1" stopColor="#7a4a0c" />
                </linearGradient>
            </defs>
            <path d="M24 3 7 9v12c0 11 7.4 20 17 24 9.6-4 17-13 17-24V9L24 3Z" fill="rgba(20,10,3,0.85)" stroke="url(#gk-gold)" strokeWidth="2" />
            <path d="M24 8.5 11.5 13v8.5c0 8 5.3 14.8 12.5 18 7.2-3.2 12.5-10 12.5-18V13L24 8.5Z" fill="none" stroke="url(#gk-gold)" strokeWidth="0.8" opacity="0.55" />
            <g stroke="url(#gk-gold)" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M17 32 30.5 18.5" />
            </g>
            <path d="M27 14.5 34.5 22l2.6-2.6-7.5-7.5L27 14.5Z" fill="url(#gk-gold)" />
            <path d="M18 17h6M21 14v6M28 28h6M31 25v6" stroke="url(#gk-gold)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </svg>
    );
}
