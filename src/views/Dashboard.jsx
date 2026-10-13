import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { isDone, getVictory, VICTORIES, VICTORY_COLORS } from "../utils/constants";
import DiffDots from "../components/DiffDots";
import Tag from "../components/Tag";
import PressureBadge from "../components/PressureBadge";

const DAY = 24 * 60 * 60 * 1000;

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

function Label({ children, color }) {
    const t = useTheme();
    return <div style={{ fontSize: 9, letterSpacing: 3, color: color ?? t.text4, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

function Hero({ camp, lords, checked, mode, since, onComplete, onEnd, onStart, onRandom, onOpenRoadmap }) {
    const t = useTheme();
    const [completing, setCompleting] = useState(false);
    const [kills, setKills] = useState("");

    const rc = camp.raceColor || camp.tierColor;
    const cl = camp.tierColor;
    const active = mode === "active";
    const doneLords = lords.filter((l) => isDone(checked[l.lordId])).length;
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

                <div style={{ display: "grid", gridTemplateColumns: active ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
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

                {lords.length > 1 && (
                    <div style={{ marginBottom: 18 }}>
                        <Label>{camp.faction} lords · {doneLords} of {lords.length} done</Label>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {lords.map((l) => {
                                const lDone = isDone(checked[l.lordId]);
                                const v = getVictory(checked[l.lordId]);
                                const isCur = l.lordId === camp.lordId;
                                return (
                                    <div key={l.lordId} title={l.note} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 10px", borderRadius: 20, border: `1px solid ${isCur ? rc + "90" : lDone ? "rgba(74,222,128,0.35)" : t.border}`, background: isCur ? `${rc}20` : lDone ? "rgba(74,222,128,0.07)" : "transparent", color: isCur ? rc : lDone ? t.text4 : t.text3 }}>
                                        {lDone ? <span style={{ color: v ? VICTORY_COLORS[v] : "#4ade80" }}>🏆</span> : isCur ? <span>▶</span> : <span style={{ opacity: 0.5 }}>○</span>}
                                        <span style={{ textDecoration: lDone ? "line-through" : "none" }}>{l.lord}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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

export default function Dashboard({ roadmap, campaigns, checked, setChecked, activeCampaign, setActiveCampaign, activeSince, onRandom, onOpenRoadmap }) {
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
    const upNext = currentCamp ? openCards.slice(0, 3) : openCards.slice(1, 4);
    const heroLords = heroCamp ? allEntries.filter((e) => e.factionId === heroCamp.factionId) : [];

    const start = (id) => setActiveCampaign(id);

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
                    checked={checked}
                    mode={currentCamp ? "active" : "suggest"}
                    since={sinceText(activeSince?.id === activeCampaign ? activeSince.at : null)}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
                <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, color: t.text4, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Tier Progress</div>
                    {roadmap.map((r) => {
                        const lords = allEntries.filter((e) => e.tier === r.tier);
                        const d = lords.filter((e) => isDone(checked[getKey(e)])).length;
                        return (
                            <div key={r.tier} style={{ marginBottom: 11 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ color: t.text2 }}>{r.tierLabel}</span>
                                    <span style={{ color: r.tierColor }}>{d}/{lords.length} lords</span>
                                </div>
                                <div style={{ background: t.bg2, borderRadius: 3, height: 4, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${lords.length ? (d / lords.length) * 100 : 0}%`, background: r.tierColor, transition: "width 0.5s", borderRadius: 3 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, color: "#c060d8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>✦ Up next</div>
                    {upNext.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>Nothing else open on the Roadmap.</div>}
                    {upNext.map((e) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${t.border}` }}>
                            <FactionIcon src={e.icon} name={e.faction} color={e.raceColor || e.tierColor} size={30} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, color: t.text1 }}>{e.faction}</div>
                                <div style={{ fontSize: 11, color: e.raceColor || e.tierColor }}>{e.lord}</div>
                            </div>
                            <DiffDots value={e.difficulty} color={e.tierColor} />
                            <button onClick={() => start(e.id)} title={currentCamp ? `Switch your active campaign to ${e.lord}` : undefined} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${e.tierColor}50`, color: e.tierColor, fontFamily: "inherit" }}>▷ Start</button>
                        </div>
                    ))}
                </div>
            </div>

            {done > 0 && (
                <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, color: t.text4, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Hall of Fame – Completed Campaigns</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {allEntries.filter((e) => isDone(checked[getKey(e)])).map((e) => {
                            const v = getVictory(checked[getKey(e)]);
                            return (
                                <div key={e.id} style={{ background: t.bg2, border: `1px solid ${e.tierColor}30`, borderRadius: 8, padding: "10px 14px", minWidth: 140 }}>
                                    <div style={{ fontSize: 13, color: t.text1, marginBottom: 1 }}>{e.faction}</div>
                                    <div style={{ fontSize: 11, color: e.tierColor }}>{e.lord}</div>
                                    {v && <div style={{ fontSize: 10, color: VICTORY_COLORS[v], marginTop: 3 }}>🏆 {v}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
