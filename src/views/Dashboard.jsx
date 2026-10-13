import { useState, useRef } from "react";
import { load, save } from "../hooks/usePersist";
import { useTheme } from "../context/ThemeContext";
import { isDone, VICTORIES, VICTORY_COLORS } from "../utils/constants";
import DiffDots from "../components/DiffDots";
import PressureBadge from "../components/PressureBadge";

const DAY = 24 * 60 * 60 * 1000;
const DETAILS_KEY = "tww3_lordDetails";

function sinceText(at) {
    if (!at) return null;
    const days = Math.floor((Date.now() - at) / DAY);
    const date = new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    if (days <= 0) return `Started today`;
    if (days === 1) return `Started yesterday · ${date}`;
    return `Started ${days} days ago · ${date}`;
}

function FactionIcon({ src, name, color, size }) {
    const [failed, setFailed] = useState(false);
    if (src && src.startsWith("http") && !failed) {
        return <img src={src} alt={name} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", filter: `drop-shadow(0 0 18px ${color}55) drop-shadow(0 2px 4px rgba(0,0,0,0.6))` }} />;
    }
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}80`, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, color }}>
            {name?.[0] ?? "?"}
        </div>
    );
}

function SessionLog({ entries, onAdd, onDelete, color }) {
    const t = useTheme();
    const [text, setText] = useState("");
    const [turn, setTurn] = useState("");

    const add = () => {
        if (!text.trim()) return;
        onAdd(text.trim(), turn ? Number(turn) : null);
        setText("");
    };

    const field = { fontSize: 13, padding: "8px 10px", borderRadius: 7, background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text1, fontFamily: "inherit", outline: "none" };

    return (
        <div style={{ marginBottom: 18 }}>
            <Label>📜 Session log{entries.length ? ` · ${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : ""}</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: entries.length ? 10 : 0, alignItems: "flex-start" }}>
                <input type="number" min="1" value={turn} placeholder="Turn" title="Turn number (optional)" onChange={(e) => setTurn(e.target.value)} style={{ ...field, width: 64, color }} />
                <textarea
                    value={text}
                    rows={1}
                    placeholder="What happened? Enter to add, Shift+Enter for a new line"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
                    style={{ ...field, flex: 1, resize: "vertical", minHeight: 20, lineHeight: 1.5 }}
                />
                <button onClick={add} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: `${color}22`, border: `1px solid ${color}70`, color }}>Add</button>
            </div>
            {entries.length > 0 && (
                <div style={{ maxHeight: 210, overflowY: "auto", borderLeft: `2px solid ${color}40`, paddingLeft: 14 }}>
                    {entries.map((e) => (
                        <div key={e.id} style={{ display: "flex", gap: 12, padding: "6px 0", alignItems: "baseline" }}>
                            <div style={{ width: 84, flexShrink: 0, fontSize: 10, color: t.text4, lineHeight: 1.5 }}>
                                {e.turn != null && <div style={{ color, fontSize: 11 }}>Turn {e.turn}</div>}
                                {new Date(e.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ flex: 1, fontSize: 13, color: t.text2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{e.text}</div>
                            <button onClick={() => { if (window.confirm("Delete this log entry?")) onDelete(e.id); }} title="Delete entry" style={{ background: "transparent", border: "none", color: t.text4, cursor: "pointer", fontSize: 12, opacity: 0.6 }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function LordDetails({ lord, details, color, onLoad, error }) {
    const t = useTheme();
    const fileInput = useRef(null);
    const panel = { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 9, padding: "14px 16px" };

    if (!details) {
        return (
            <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", justifyContent: "center" }}>
                <Label color={color}>Skill tree &amp; legendary heroes</Label>
                <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.65 }}>
                    Which units {lord}'s skills buff and which legendary heroes you can unlock come from your own copy of the game.
                    Build <code>lord-details.json</code> with the refresh script, then load it here. It stays on this PC.
                </div>
                <button onClick={() => fileInput.current?.click()} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: `${color}18`, border: `1px solid ${color}60`, color, fontFamily: "inherit" }}>Load lord details file</button>
                {error && <div style={{ fontSize: 12, color: "#e06050" }}>{error}</div>}
                <input ref={fileInput} type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onLoad(f); }} style={{ display: "none" }} />
            </div>
        );
    }

    const units = details.units ?? [];
    const heroes = details.heroes ?? [];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={panel}>
                <Label color={color}>⚒ Units {lord} buffs</Label>
                {units.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>No unit-specific skills found.</div>}
                {units.map((u) => (
                    <div key={u.unit} style={{ padding: "8px 0", borderTop: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: 14, color: t.text1, marginBottom: 3 }}>{u.unit}</div>
                        {u.buffs.map((b, i) => (
                            <div key={i} style={{ fontSize: 12, color: t.text3, lineHeight: 1.55 }}>
                                <span style={{ color }}>{b.skill}</span> · {b.effect}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div style={panel}>
                <Label color={color}>★ Legendary heroes</Label>
                {heroes.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>None for this faction.</div>}
                {heroes.map((h) => (
                    <div key={h.name} style={{ padding: "8px 0", borderTop: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: 14, color: t.text1 }}>{h.name} <span style={{ fontSize: 11, color: t.text4 }}>{h.type}</span></div>
                        {h.unlock && <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.55 }}>{h.unlock}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Label({ children, color }) {
    const t = useTheme();
    return <div style={{ fontSize: 9, letterSpacing: 3, color: color ?? t.text4, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

function Hero({ camp, lords, mode, since, log, onLogAdd, onLogDelete, details, detailsError, onLoadDetails, onComplete, onEnd, onStart, onRandom, onOpenRoadmap }) {
    const t = useTheme();
    const [completing, setCompleting] = useState(false);
    const [kills, setKills] = useState("");

    const rc = camp.raceColor || camp.tierColor;
    const cl = camp.tierColor;
    const active = mode === "active";
    const lordNo = lords.findIndex((l) => l.lordId === camp.lordId) + 1;
    const style = camp.styles?.[0];

    const btn = (color, filled) => ({ fontSize: 12, padding: "9px 18px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: filled ? `${color}22` : "transparent", border: `1px solid ${color}${filled ? "70" : "40"}`, color });

    return (
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, border: `1px solid ${rc}55`, background: `linear-gradient(135deg, ${rc}1f 0%, ${rc}08 38%, transparent 70%), ${t.bg3}`, boxShadow: `0 0 50px ${rc}12, inset 0 1px 0 ${rc}25`, marginBottom: 18 }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, ${rc}, ${rc}60 60%, transparent)` }} />

            {/* Faint faction crest behind the content */}
            <div style={{ position: "absolute", right: -40, top: -20, opacity: 0.06, pointerEvents: "none" }}>
                <FactionIcon src={camp.icon} name={camp.faction} color={rc} size={320} />
            </div>

            <div style={{ position: "relative", padding: "24px 28px 22px" }}>
                <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 18 }}>
                    <div style={{ flexShrink: 0, width: 112, height: 112, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle, ${rc}26 0%, transparent 70%)` }}>
                        <FactionIcon src={camp.icon} name={camp.faction} color={rc} size={92} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                            <div style={{ fontSize: 10, letterSpacing: 4, color: active ? "#7ac050" : "#c060d8", textTransform: "uppercase" }}>
                                {active ? "▶ Now campaigning" : "✦ Your next campaign"}
                            </div>
                            {active && since && <div style={{ fontSize: 11, color: t.text4 }}>{since}</div>}
                        </div>
                        <div style={{ fontSize: 34, color: t.text1, lineHeight: 1.05, marginBottom: 6 }}>{camp.faction}</div>
                        <div style={{ fontSize: 16, color: rc, marginBottom: 12 }}>
                            {camp.lord}
                            <span style={{ fontSize: 11, color: t.text4, marginLeft: 10 }}>Lord {lordNo} of {lords.length} · {camp.game} · {camp.dlc}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", fontSize: 11, color: t.text3 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <DiffDots value={camp.difficulty} color={cl} />
                                <span style={{ color: cl, letterSpacing: 1 }}>{camp.tierLabel}</span>
                            </span>
                            {style && <span>{style.icon} {camp.styleLabel}</span>}
                            {camp.length && <span>⏳ {camp.length} campaign</span>}
                            {camp.pressure && <span style={{ display: "flex", alignItems: "center", gap: 6 }}>Start pressure <PressureBadge level={camp.pressure} /></span>}
                        </div>
                    </div>
                </div>

                {camp.note && (
                    <div style={{ fontSize: 14, color: t.text2, fontStyle: "italic", lineHeight: 1.6, borderLeft: `2px solid ${rc}70`, padding: "2px 0 2px 14px", marginBottom: 16 }}>
                        {camp.note}
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: active ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr", gap: 22, marginBottom: 6 }}>
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: active ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
                            {!active && camp.why && (
                                <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 9, padding: "12px 14px" }}>
                                    <Label>Why play this</Label>
                                    <p style={{ fontSize: 13, color: t.text2, margin: 0, lineHeight: 1.65 }}>{camp.why}</p>
                                </div>
                            )}
                            <div style={{ background: `${rc}0c`, border: `1px solid ${rc}30`, borderRadius: 9, padding: "12px 14px" }}>
                                <Label color={rc}>Key mechanic</Label>
                                <p style={{ fontSize: 13, color: t.text2, margin: 0, lineHeight: 1.65 }}>{camp.keyMechanic}</p>
                            </div>
                            <div style={{ background: t.bg2, borderLeft: `3px solid ${rc}90`, borderRadius: "0 9px 9px 0", padding: "12px 14px" }}>
                                <Label color={rc}>Campaign tip</Label>
                                <p style={{ fontSize: 13, color: t.text2, margin: 0, lineHeight: 1.65 }}>{camp.tip}</p>
                            </div>
                        </div>
                        {active && <SessionLog entries={log} onAdd={onLogAdd} onDelete={onLogDelete} color={rc} />}
                    </div>
                    {active && <LordDetails lord={camp.lord} details={details} color={rc} onLoad={onLoadDetails} error={detailsError} />}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
                    {active && !completing && (
                        <>
                            <button onClick={() => setCompleting(true)} style={btn("#4ade80", true)}>🏆 Complete campaign</button>
                            <button onClick={onOpenRoadmap} style={btn(t.text3)}>Open in Roadmap</button>
                            <button onClick={onEnd} style={{ ...btn(t.text4), marginLeft: "auto" }}>End without completing</button>
                        </>
                    )}
                    {active && completing && (
                        <>
                            <span style={{ fontSize: 12, color: t.text3 }}>Victory:</span>
                            {VICTORIES.map((v) => (
                                <button key={v} onClick={() => onComplete(v, Number(kills) || null)} style={btn(VICTORY_COLORS[v], true)}>{v}</button>
                            ))}
                            <span style={{ fontSize: 12, color: t.text3, marginLeft: 8 }}>⚔ Lords slain</span>
                            <input type="number" min="0" value={kills} placeholder="0" onChange={(e) => setKills(e.target.value)} style={{ width: 70, fontSize: 13, padding: "8px 10px", borderRadius: 7, background: t.input, border: `1px solid ${t.inputBorder}`, color: "#f97316", fontFamily: "inherit", outline: "none" }} />
                            <button onClick={() => { setCompleting(false); setKills(""); }} style={{ ...btn(t.text4), marginLeft: "auto" }}>Cancel</button>
                        </>
                    )}
                    {!active && (
                        <>
                            <button onClick={onStart} style={btn(rc, true)}>▷ Start this campaign</button>
                            <button onClick={onRandom} style={btn(t.accent)}>🎲 Roll a random one</button>
                            <button onClick={onOpenRoadmap} style={{ ...btn(t.text4), marginLeft: "auto" }}>Browse the Roadmap</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({ roadmap, campaigns, checked, setChecked, activeCampaign, setActiveCampaign, activeSince, sessionLog, setSessionLog, onRandom, onOpenRoadmap }) {
    const t = useTheme();

    const allEntries = campaigns;
    const getKey = (entry) => entry.lordId;

    const done = allEntries.filter((e) => isDone(checked[getKey(e)])).length;
    const total = allEntries.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const currentCamp = allEntries.find((e) => e.id === activeCampaign);

    // The easiest faction cards still open on the roadmap, other than the faction being played.
    const openCards = roadmap.flatMap((r) => r.entries).filter((e) => !e.complete && e.factionId !== currentCamp?.factionId);
    const currentTier = roadmap.find((r) => r.entries.some((e) => !e.complete));
    const heroCamp = currentCamp ?? openCards[0];
    const heroLords = heroCamp ? allEntries.filter((e) => e.factionId === heroCamp.factionId) : [];

    const start = (id) => setActiveCampaign(id);

    // Skill-tree and hero details come from a file built from your own game install.
    const [lordDetails, setLordDetails] = useState(() => load(DETAILS_KEY, null));
    const [detailsError, setDetailsError] = useState(null);
    const importDetails = (file) => {
        file.text().then((text) => {
            const data = JSON.parse(text);
            if (data.format !== "grudgekeeper-lord-details" || typeof data.lords !== "object") {
                throw new Error("This isn't a lord details file.");
            }
            save(DETAILS_KEY, data);
            setLordDetails(data);
            setDetailsError(null);
        }).catch((err) => setDetailsError(err.message));
    };

    // Session log entries are kept per lord, newest first.
    const addLog = (text, turn) => {
        const key = currentCamp.lordId;
        const entry = { id: `log_${Date.now()}`, at: Date.now(), turn, text };
        setSessionLog((p) => ({ ...p, [key]: [entry, ...(p[key] ?? [])] }));
    };
    const deleteLog = (id) => {
        const key = currentCamp.lordId;
        setSessionLog((p) => ({ ...p, [key]: (p[key] ?? []).filter((e) => e.id !== id) }));
    };

    const complete = (victory, kills) => {
        const key = currentCamp.lordId;
        setChecked((p) => ({ ...p, [key]: kills != null ? { done: true, victory, kills } : { done: true, victory } }));
        setActiveCampaign(null);
    };

    const stats = [
        { label: "Completed", value: done, sub: `of ${total}`, color: "#4ade80" },
        { label: "Progress", value: `${pct}%`, sub: "of the Roadmap", color: "#facc15" },
        { label: "Current Tier", value: currentTier?.tier ?? "✓", sub: currentTier?.tierLabel?.toLowerCase() ?? "all done", color: currentTier?.tierColor ?? "#f97316" },
        { label: "Remaining", value: total - done, sub: "campaigns", color: "#c084fc" },
    ];

    return (
        <div style={{ padding: "30px 42px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
                <div>
                    <div style={{ fontSize: 10, letterSpacing: 5, color: t.text4, textTransform: "uppercase", marginBottom: 6 }}>Overview</div>
                    <h2 style={{ fontSize: 26, color: t.text1, fontWeight: "normal", margin: 0 }}>Dashboard</h2>
                </div>
                <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 10, background: t.bg3, overflow: "hidden" }}>
                    {stats.map((s, i) => (
                        <div key={s.label} style={{ padding: "9px 18px", borderLeft: i ? `1px solid ${t.border}` : "none", minWidth: 92 }}>
                            <div style={{ fontSize: 9, color: t.text4, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                <span style={{ fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</span>
                                <span style={{ fontSize: 10, color: t.text3 }}>{s.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {heroCamp ? (
                <Hero
                    key={heroCamp.id}
                    camp={heroCamp}
                    lords={heroLords}
                    mode={currentCamp ? "active" : "suggest"}
                    since={sinceText(activeSince?.id === activeCampaign ? activeSince.at : null)}
                    log={sessionLog[heroCamp.lordId] ?? []}
                    onLogAdd={addLog}
                    onLogDelete={deleteLog}
                    details={lordDetails?.lords?.[heroCamp.lordId] ?? (lordDetails ? {} : null)}
                    detailsError={detailsError}
                    onLoadDetails={importDetails}
                    onComplete={complete}
                    onEnd={() => setActiveCampaign(null)}
                    onStart={() => start(heroCamp.id)}
                    onRandom={onRandom}
                    onOpenRoadmap={() => onOpenRoadmap(heroCamp.tier)}
                />
            ) : (
                <div style={{ borderRadius: 14, border: `1px solid #4ade8055`, background: t.bg3, padding: "30px 28px", marginBottom: 18, textAlign: "center" }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>🏆</div>
                    <div style={{ fontSize: 20, color: t.text1 }}>Every campaign is done.</div>
                    <div style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>The book of grudges is closed. For now.</div>
                </div>
            )}

        </div>
    );
}
