import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { isDone, getVictory, getKills, VICTORY_COLORS } from "../utils/constants";
import DiffDots from "../components/DiffDots";
import Tag from "../components/Tag";
import PressureBadge from "../components/PressureBadge";

const MAX = 3;
const PRESSURES = { Low: 1, Medium: 2, High: 3, "Very High": 4 };

function Crest({ src, name, color }) {
    const [failed, setFailed] = useState(false);
    if (src?.startsWith("http") && !failed) {
        return <img src={src} alt={name} onError={() => setFailed(true)} style={{ width: 64, height: 64, objectFit: "contain", filter: `drop-shadow(0 0 12px ${color}55)` }} />;
    }
    return <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${color}80`, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color }}>{name?.[0] ?? "?"}</div>;
}

export default function Compare({ roadmap, checked, compareIds, setCompareIds, activeCampaign, setActiveCampaign }) {
    const t = useTheme();

    const cards = roadmap.flatMap((r) => r.entries);
    const byId = Object.fromEntries(cards.map((c) => [c.factionId, c]));
    const fallback = cards.filter((c) => !c.complete && !c.needsDlc).slice(0, 2).map((c) => c.factionId);
    const ids = (compareIds.length ? compareIds : fallback).filter((id) => byId[id]);
    const picked = ids.map((id) => byId[id]);
    const options = [...cards].sort((a, b) => a.faction.localeCompare(b.faction));

    const setSlot = (i, id) => {
        const next = [...ids];
        if (id) next[i] = id; else next.splice(i, 1);
        setCompareIds(next.filter((x, j) => next.indexOf(x) === j));
    };

    // Highlight the easiest value in a row when the factions differ.
    const best = (vals) => {
        const nums = vals.filter((v) => v != null);
        const min = Math.min(...nums);
        return nums.length > 1 && nums.some((v) => v !== min) ? min : null;
    };
    const diffBest = best(picked.map((c) => (c.complete ? null : c.difficulty)));
    const presBest = best(picked.map((c) => PRESSURES[c.pressure] ?? null));
    const easier = (on) => (on ? { background: "rgba(74,222,128,0.07)", boxShadow: "inset 0 0 0 1px rgba(74,222,128,0.25)" } : {});

    const cols = `150px repeat(${Math.max(picked.length, 1)}, 1fr)`;
    const label = (text) => <div style={{ fontSize: 9, letterSpacing: 2, color: t.text4, textTransform: "uppercase", paddingTop: 3 }}>{text}</div>;
    const cell = { fontSize: 13, color: t.text2, lineHeight: 1.6, borderRadius: 6, padding: "2px 8px" };

    const Row = ({ name, render, align = "start" }) => (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, padding: "11px 0", borderTop: `1px solid ${t.border}`, alignItems: align }}>
            {label(name)}
            {picked.map((c) => <div key={c.factionId} style={cell}>{render(c)}</div>)}
        </div>
    );

    return (
        <div style={{ padding: "30px 42px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: 5, color: t.text4, textTransform: "uppercase", marginBottom: 6 }}>Side by side</div>
                <h2 style={{ fontSize: 26, color: t.text1, fontWeight: "normal", margin: 0 }}>Compare Factions</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: t.text4, lineHeight: 1.5, paddingTop: 8 }}>Pick up to {MAX} factions.<br /><span style={{ color: "#4ade80" }}>Green</span> marks the easier pick.</div>
                {[...picked, ...(picked.length < MAX ? [null] : [])].map((c, i) => (
                    <select key={c?.factionId ?? "add"} value={c?.factionId ?? ""} onChange={(e) => setSlot(i, e.target.value)} style={{ fontSize: 13, padding: "8px 10px", borderRadius: 7, background: t.input, border: `1px ${c ? "solid" : "dashed"} ${t.inputBorder}`, color: c ? t.text1 : t.text4, fontFamily: "inherit", outline: "none" }}>
                        <option value="">{c ? "✕ Remove" : "＋ Add a faction…"}</option>
                        {options.map((o) => <option key={o.factionId} value={o.factionId} disabled={ids.includes(o.factionId) && o.factionId !== c?.factionId}>{o.faction}</option>)}
                    </select>
                ))}
            </div>

            {picked.length > 0 && (
                <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 12, padding: "6px 20px 10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, padding: "14px 0" }}>
                        <div />
                        {picked.map((c) => {
                            const rc = c.raceColor || c.tierColor;
                            return (
                                <div key={c.factionId} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                                    <Crest src={c.icon} name={c.faction} color={rc} />
                                    <div>
                                        <div style={{ fontSize: 20, color: t.text1, lineHeight: 1.1 }}>{c.faction}</div>
                                        <div style={{ fontSize: 11, color: t.text4, marginTop: 3 }}>{c.game} · {c.factionLords.length} lords</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Row name="Next lord" render={(c) => (
                        c.complete ? <span style={{ color: "#4ade80" }}>✓ Faction complete</span>
                            : <span>
                                <span style={{ color: c.raceColor || c.tierColor }}>{c.lord}</span>
                                {c.needsDlc && <span style={{ display: "block", fontSize: 11, color: "#ef4444" }}>🔒 Needs {c.pack}</span>}
                                {activeCampaign === c.id && <span style={{ fontSize: 9, marginLeft: 8, padding: "1px 6px", borderRadius: 10, background: `${c.tierColor}25`, color: c.tierColor, letterSpacing: 1 }}>ACTIVE</span>}
                            </span>
                    )} />
                    <Row name="Difficulty" render={(c) => c.complete ? "—" : (
                        <div style={{ ...easier(c.difficulty === diffBest), margin: "-2px -8px", padding: "4px 8px", borderRadius: 6, display: "flex", gap: 8, alignItems: "center" }}>
                            <DiffDots value={c.difficulty} color={c.tierColor} />
                            <span style={{ fontSize: 11, color: c.tierColor, letterSpacing: 1 }}>{c.tierLabel}</span>
                        </div>
                    )} />
                    <Row name="Play style" render={(c) => c.styles.map((s) => `${s.icon} ${s.label}`).join("  ·  ")} />
                    <Row name="Campaign length" render={(c) => `⏳ ${c.length ?? "—"}`} />
                    <Row name="Start pressure" render={(c) => <div style={{ ...easier(PRESSURES[c.pressure] === presBest), margin: "-2px -8px", padding: "4px 8px", borderRadius: 6, width: "fit-content" }}><PressureBadge level={c.pressure} /></div>} />
                    <Row name="Strengths" render={(c) => <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{c.tags.map((tag) => <Tag key={tag} label={tag} color={c.raceColor || c.tierColor} />)}</div>} />
                    <Row name="Key mechanic" render={(c) => c.keyMechanic} />
                    <Row name="Why play it" render={(c) => c.why} />
                    <Row name="Campaign tip" render={(c) => <span style={{ fontStyle: "italic" }}>{c.tip}</span>} />
                    <Row name="Your record" render={(c) => {
                        const done = c.factionLords.filter((l) => isDone(checked[l.lordId]));
                        const kills = done.reduce((s, l) => s + (getKills(checked[l.lordId]) ?? 0), 0);
                        const locked = c.factionLords.filter((l) => !l.owned && !isDone(checked[l.lordId])).length;
                        return (
                            <div>
                                <div><span style={{ fontSize: 18, color: done.length ? "#4ade80" : t.text3 }}>{done.length}</span><span style={{ color: t.text4 }}> / {c.factionLords.length} lords done</span>{kills > 0 && <span style={{ color: "#f97316", marginLeft: 10 }}>⚔ {kills}</span>}</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                    {done.map((l) => {
                                        const v = getVictory(checked[l.lordId]);
                                        return <span key={l.lordId} style={{ fontSize: 10, color: v ? VICTORY_COLORS[v] : t.text3 }}>🏆 {l.lord}</span>;
                                    })}
                                </div>
                                {locked > 0 && <div style={{ fontSize: 11, color: t.text4, marginTop: 4 }}>🔒 {locked} {locked === 1 ? "lord needs" : "lords need"} DLC you don't own</div>}
                            </div>
                        );
                    }} />
                    <Row name="" align="center" render={(c) => (!c.complete && !c.needsDlc) ? (
                        <button onClick={() => setActiveCampaign(activeCampaign === c.id ? null : c.id)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: activeCampaign === c.id ? `${c.tierColor}25` : "transparent", border: `1px solid ${c.tierColor}60`, color: c.tierColor }}>{activeCampaign === c.id ? "▶ Active" : `▷ Start ${c.lord}`}</button>
                    ) : null} />
                </div>
            )}
        </div>
    );
}
