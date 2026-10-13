import { useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCampaignLog } from "../hooks/useCampaignLog";
import { resultLabel, isVictory, summariseUnits } from "../utils/campaignLog";

// Live campaign chronicle fed by the logger mod (mod/grudgekeeper_logger).
// Self-contained: it finds and polls the log itself.
//   campaignId  show this campaign's log instead of the most recent one
//   color       accent colour (defaults to the theme accent)
//   maxHeight   height of the scrolling timeline

const LIVE_MS = 2 * 60 * 1000;
const FILTERS = [
    { id: "all", label: "Everything" },
    { id: "battle", label: "Battles" },
    { id: "lords", label: "Lords" },
    { id: "regions", label: "Settlements" },
];

function matchesFilter(e, filter) {
    if (filter === "all") return e.t !== "turn" && e.t !== "start";
    if (filter === "battle") return e.t === "battle";
    if (filter === "lords") return ["recruit", "character_created", "rank_up", "lord_down", "confederation"].includes(e.t);
    if (filter === "regions") return e.t === "region_gained" || e.t === "region_lost";
    return true;
}

const fmt = (n) => (n == null ? "–" : Number(n).toLocaleString());
const timeOf = (at) => (at ? new Date(at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function Stat({ label, value, sub, color }) {
    const t = useTheme();
    return (
        <div style={{ flex: "1 1 90px", padding: "8px 12px", borderRadius: 8, background: t.bg3, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: t.text4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 20, color: color ?? t.text1, lineHeight: 1.3 }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: t.text4 }}>{sub}</div>}
        </div>
    );
}

function lordLabel(army) {
    return army?.lord?.name || army?.faction_name || "Unknown lord";
}

function BattleEntry({ e, log, color }) {
    const t = useTheme();
    const [open, setOpen] = useState(false);
    const mine = log.playerSide(e);
    const theirs = log.enemySide(e);
    const won = isVictory(mine.result);
    const myLords = (mine.armies ?? []).filter((a) => a.faction === log.faction);
    const enemyLead = theirs.armies?.[0];
    const tags = [e.siege && "Siege", e.ambush && "Ambush", e.naval && "Naval", e.night && "Night", e.autoresolved && "Autoresolved"].filter(Boolean);

    return (
        <div>
            <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 13, color: won ? "#7ac050" : "#d8604a" }}>
                    {won ? "⚔" : "☠"} {resultLabel(mine.result)}{e.region_name ? ` at ${e.region_name}` : ""}
                    <span style={{ fontSize: 10, color: t.text4, marginLeft: 8 }}>{open ? "▾" : "▸"}</span>
                </div>
                <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>
                    {myLords.map((a, i) => (
                        <span key={i}>{i > 0 && ", "}<span style={{ color }}>{lordLabel(a)}</span>{a.lord_kills != null && ` (${fmt(a.lord_kills)} kills)`}</span>
                    ))}
                    {enemyLead && <> vs {lordLabel(enemyLead)}{enemyLead.faction_name && enemyLead.lord?.name ? ` of ${enemyLead.faction_name}` : ""}</>}
                </div>
                <div style={{ fontSize: 11, color: t.text3 }}>
                    {fmt(mine.kills)} killed · {fmt(mine.casualties)} lost{tags.length ? ` · ${tags.join(" · ")}` : ""}
                </div>
            </div>
            {open && (
                <div style={{ marginTop: 6, fontSize: 11, color: t.text3, lineHeight: 1.6 }}>
                    {[["Your side", mine], ["Enemy", theirs]].map(([label, side]) => (
                        <div key={label} style={{ marginBottom: 4 }}>
                            <span style={{ color: t.text4, letterSpacing: 1 }}>{label.toUpperCase()}</span>
                            {(side.armies ?? []).map((a, i) => (
                                <div key={i}><span style={{ color: t.text2 }}>{lordLabel(a)}</span>: {summariseUnits(log.unitNames, a.units ?? []).join(", ") || "no units recorded"}</div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EventText({ e, log, color }) {
    const t = useTheme();
    const who = e.character?.name || e.character?.subtype || "A character";
    const isLord = e.character?.type === "general";
    switch (e.t) {
        case "battle": return <BattleEntry e={e} log={log} color={color} />;
        case "recruit":
        case "character_created":
            return <div style={{ fontSize: 13, color: t.text2 }}>{isLord ? "👑" : "🗡"} <span style={{ color }}>{who}</span> {e.t === "recruit" ? "recruited" : "joined"} {isLord ? "as a lord" : "as a hero"}</div>;
        case "rank_up":
            return <div style={{ fontSize: 13, color: t.text2 }}>⬆ <span style={{ color }}>{who}</span> reached rank {e.character?.rank}</div>;
        case "lord_down":
            return <div style={{ fontSize: 13, color: "#d8604a" }}>✚ {who} {e.wounded ? "was wounded" : "fell"}</div>;
        case "region_gained":
            return <div style={{ fontSize: 13, color: t.text2 }}>🏰 Took <span style={{ color }}>{e.region_name}</span></div>;
        case "region_lost":
            return <div style={{ fontSize: 13, color: "#d8604a" }}>🔥 Lost {e.region_name}</div>;
        case "confederation":
            return <div style={{ fontSize: 13, color: t.text2 }}>🤝 Confederated <span style={{ color }}>{e.faction_name}</span></div>;
        default:
            return <div style={{ fontSize: 12, color: t.text3 }}>{e.t}</div>;
    }
}

function Armies({ log, color }) {
    const t = useTheme();
    if (!log.armies.length) return <div style={{ fontSize: 12, color: t.text4 }}>Armies appear at the start of your next turn.</div>;
    return log.armies.map((a) => {
        const hp = a.units.length ? Math.round(a.units.reduce((s, u) => s + u.hp, 0) / a.units.length) : 0;
        return (
            <div key={a.cqi} style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                    <span style={{ color }}>{a.lord?.name || "Unnamed lord"}</span>
                    <span style={{ fontSize: 11, color: t.text4 }}>Rank {a.lord?.rank ?? "?"} · {a.units.length}/20 · {hp}%</span>
                </div>
                <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.5 }}>{summariseUnits(log.unitNames, a.units.map((u) => u.key)).join(", ")}</div>
            </div>
        );
    });
}

export default function CampaignLogTimeline({ campaignId, color, maxHeight = 420 }) {
    const t = useTheme();
    const accent = color ?? t.accent;
    const [picked, setPicked] = useState(null);
    const [filter, setFilter] = useState("all");
    const { log: view, campaigns, status } = useCampaignLog(picked ?? campaignId);

    const byTurn = useMemo(() => {
        if (!view) return [];
        const groups = new Map();
        for (const e of [...view.events].reverse()) {
            if (!matchesFilter(e, filter)) continue;
            if (!groups.has(e.turn)) groups.set(e.turn, []);
            groups.get(e.turn).push(e);
        }
        return [...groups];
    }, [view, filter]);

    const box = { borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg3, padding: "16px 18px" };
    const label = { fontSize: 9, letterSpacing: 3, color: t.text4, textTransform: "uppercase", marginBottom: 8 };

    if (status !== "ready" || !view) {
        return (
            <div style={box}>
                <div style={label}>⚔ Campaign chronicle</div>
                <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.6 }}>
                    {status === "loading" && "Looking for campaign logs…"}
                    {status === "none" && "No campaign log yet. Enable the Grudgekeeper Logger mod in the launcher and play a turn; battles, lords and settlements will appear here live."}
                    {status === "unavailable" && "Campaign logs can only be read in the desktop app."}
                </div>
            </div>
        );
    }

    const live = view.modified && Date.now() - view.modified < LIVE_MS;
    const s = view.stats;

    return (
        <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div>
                    <div style={label}>⚔ Campaign chronicle {live && <span style={{ color: "#7ac050", letterSpacing: 1 }}>● live</span>}</div>
                    <div style={{ fontSize: 18, color: t.text1 }}>
                        {view.factionName}{view.turn ? <span style={{ fontSize: 13, color: accent, marginLeft: 10 }}>Turn {view.turn}</span> : null}
                    </div>
                    {view.leader?.name && <div style={{ fontSize: 12, color: t.text3 }}>{view.leader.name} · started {timeOf(view.startedAt)}</div>}
                </div>
                {campaigns.length > 1 && (
                    <select value={picked ?? view.id ?? ""} onChange={(e) => setPicked(e.target.value)} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 7, background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text2, fontFamily: "inherit" }}>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.factionName ?? c.id}{c.startedAt ? ` · ${new Date(c.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <Stat label="Battles" value={`${s.won}–${s.lost}`} sub={`${s.heroic} heroic`} color={accent} />
                <Stat label="Kills" value={fmt(s.kills)} sub={`${fmt(s.losses)} lost`} />
                <Stat label="Settlements" value={`+${s.regionsGained}`} sub={s.regionsLost ? `${s.regionsLost} lost` : "none lost"} />
                <Stat label="Lords & heroes" value={s.recruited} sub="recruited or joined" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 18 }}>
                <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                        {FILTERS.map((f) => (
                            <button key={f.id} onClick={() => setFilter(f.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: filter === f.id ? `${accent}22` : "transparent", border: `1px solid ${filter === f.id ? `${accent}70` : t.border}`, color: filter === f.id ? accent : t.text3 }}>{f.label}</button>
                        ))}
                    </div>
                    <div style={{ maxHeight, overflowY: "auto", borderLeft: `2px solid ${accent}40`, paddingLeft: 14 }}>
                        {byTurn.length === 0 && <div style={{ fontSize: 12, color: t.text4 }}>Nothing logged here yet.</div>}
                        {byTurn.map(([turn, events]) => (
                            <div key={turn} style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: accent, marginBottom: 4 }}>Turn {turn}</div>
                                {events.map((e) => (
                                    <div key={`${e.n}-${e.t}`} style={{ display: "flex", gap: 12, padding: "5px 0" }}>
                                        <div style={{ flex: 1, minWidth: 0 }}><EventText e={e} log={view} color={accent} /></div>
                                        <div style={{ fontSize: 10, color: t.text4, whiteSpace: "nowrap" }}>{timeOf(e.at)}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={label}>Armies now</div>
                    <div style={{ maxHeight: maxHeight + 34, overflowY: "auto" }}><Armies log={view} color={accent} /></div>
                </div>
            </div>
        </div>
    );
}
