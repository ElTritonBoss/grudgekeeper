import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { VICTORIES, VICTORY_COLORS } from "../utils/constants";
import { RULES, ICONS, PRESETS, achievementProgress, isEarned, describe } from "../utils/achievements";

const EMPTY = { icon: "🏆", title: "", rule: "count", target: "", count: 10, victory: "", note: "" };

function Form({ initial, campaigns, onSave, onCancel }) {
    const t = useTheme();
    const [a, setA] = useState(initial);
    const set = (k, v) => setA((p) => ({ ...p, [k]: v }));

    const factions = [...new Map(campaigns.map((c) => [c.factionId, c.faction])).entries()];
    const field = { fontSize: 13, padding: "8px 10px", borderRadius: 7, background: t.input, border: `1px solid ${t.inputBorder}`, color: t.text1, fontFamily: "inherit", outline: "none" };
    const needsTarget = a.rule === "lord" || a.rule === "faction";
    const valid = a.title.trim() && (!needsTarget || a.target);

    const save = () => {
        if (!valid) return;
        onSave({
            ...a,
            title: a.title.trim(),
            count: Number(a.count) || 1,
            victory: a.victory || null,
            target: needsTarget ? a.target : null,
        });
    };

    return (
        <div style={{ background: t.bg3, border: `1px solid ${t.accent}50`, borderRadius: 12, padding: "18px 20px", marginBottom: 22 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {ICONS.map((i) => (
                    <button key={i} onClick={() => set("icon", i)} style={{ fontSize: 18, width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: a.icon === i ? t.accentGlow : "transparent", border: `1px solid ${a.icon === i ? t.accent : t.border}` }}>{i}</button>
                ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <input autoFocus value={a.title} placeholder="Name it, e.g. Grudges Settled" onChange={(e) => set("title", e.target.value)} style={field} />
                <select value={a.rule} onChange={(e) => setA((p) => ({ ...p, rule: e.target.value, target: "" }))} style={field}>
                    {RULES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                {a.rule === "lord" && (
                    <select value={a.target} onChange={(e) => set("target", e.target.value)} style={{ ...field, minWidth: 280 }}>
                        <option value="">Choose a lord…</option>
                        {campaigns.map((c) => <option key={c.lordId} value={c.lordId}>{c.faction} · {c.lord}</option>)}
                    </select>
                )}
                {a.rule === "faction" && (
                    <select value={a.target} onChange={(e) => set("target", e.target.value)} style={{ ...field, minWidth: 280 }}>
                        <option value="">Choose a faction…</option>
                        {factions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                )}
                {(a.rule === "count" || a.rule === "kills") && (
                    <label style={{ fontSize: 12, color: t.text3, display: "flex", gap: 8, alignItems: "center" }}>
                        {a.rule === "kills" ? "Lords slain" : "Campaigns"}
                        <input type="number" min="1" value={a.count} onChange={(e) => set("count", e.target.value)} style={{ ...field, width: 80 }} />
                    </label>
                )}
                {(a.rule === "count" || a.rule === "lord") && (
                    <label style={{ fontSize: 12, color: t.text3, display: "flex", gap: 8, alignItems: "center" }}>
                        Victory
                        <select value={a.victory ?? ""} onChange={(e) => set("victory", e.target.value)} style={field}>
                            <option value="">Any</option>
                            {VICTORIES.map((v) => <option key={v} value={v}>{v}{v !== "Ultimate" ? " or better" : ""}</option>)}
                        </select>
                    </label>
                )}
                {a.rule === "manual" && (
                    <input value={a.note ?? ""} placeholder="What counts? e.g. Win a battle with only Slayers" onChange={(e) => set("note", e.target.value)} style={{ ...field, flex: 1 }} />
                )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={save} disabled={!valid} style={{ fontSize: 12, padding: "8px 18px", borderRadius: 7, cursor: valid ? "pointer" : "default", fontFamily: "inherit", background: t.accentGlow, border: `1px solid ${t.accent}70`, color: t.accent, opacity: valid ? 1 : 0.5 }}>Save achievement</button>
                <button onClick={onCancel} style={{ fontSize: 12, padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: "transparent", border: `1px solid ${t.border}`, color: t.text4 }}>Cancel</button>
                {a.title && <span style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>{describe({ ...a, count: Number(a.count) || 1 }, campaigns)}</span>}
            </div>
        </div>
    );
}

export default function Achievements({ achievements, setAchievements, campaigns, checked }) {
    const t = useTheme();
    const [editing, setEditing] = useState(null); // null, "new" or an achievement id

    const rows = achievements.map((a) => ({ a, p: achievementProgress(a, campaigns, checked) }));
    const earned = rows.filter((r) => isEarned(r.p)).length;
    const sorted = [...rows].sort((x, y) => isEarned(y.p) - isEarned(x.p) || (y.a.earnedAt ?? 0) - (x.a.earnedAt ?? 0));
    const unusedPresets = PRESETS.filter((p) => !achievements.some((a) => a.title === p.title));

    const add = (a) => { setAchievements((p) => [...p, { ...EMPTY, ...a, id: `ach_${Date.now()}`, createdAt: Date.now(), earnedAt: null }]); setEditing(null); };
    const update = (a) => { setAchievements((p) => p.map((x) => (x.id === a.id ? a : x))); setEditing(null); };
    const remove = (id) => { if (window.confirm("Delete this achievement?")) setAchievements((p) => p.filter((x) => x.id !== id)); };
    const toggleManual = (id) => setAchievements((p) => p.map((x) => (x.id === id ? { ...x, manualDone: !x.manualDone } : x)));

    return (
        <div style={{ padding: "30px 42px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
                <div>
                    <div style={{ fontSize: 10, letterSpacing: 5, color: t.text4, textTransform: "uppercase", marginBottom: 6 }}>Your own goals</div>
                    <h2 style={{ fontSize: 26, color: t.text1, fontWeight: "normal", margin: 0 }}>Achievements</h2>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {achievements.length > 0 && <span style={{ fontSize: 13, color: t.text3 }}><span style={{ fontSize: 20, color: "#facc15" }}>{earned}</span> of {achievements.length} earned</span>}
                    {editing !== "new" && <button onClick={() => setEditing("new")} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: t.accentGlow, border: `1px solid ${t.accent}70`, color: t.accent }}>＋ New achievement</button>}
                </div>
            </div>

            {editing === "new" && <Form initial={EMPTY} campaigns={campaigns} onSave={add} onCancel={() => setEditing(null)} />}

            {unusedPresets.length > 0 && editing !== "new" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
                    <span style={{ fontSize: 10, letterSpacing: 2, color: t.text4, textTransform: "uppercase", marginRight: 4 }}>Quick add</span>
                    {unusedPresets.map((p) => (
                        <button key={p.title} onClick={() => add(p)} title={describe({ ...EMPTY, ...p }, campaigns)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", background: "transparent", border: `1px dashed ${t.border}`, color: t.text3 }}>{p.icon} {p.title}</button>
                    ))}
                </div>
            )}

            {achievements.length === 0 && editing !== "new" && (
                <div style={{ border: `1px dashed ${t.border}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", color: t.text4, fontSize: 13 }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>🏅</div>
                    No achievements yet. Set your own goals, or quick-add one above.
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {sorted.map(({ a, p }) => {
                    if (editing === a.id) return <div key={a.id} style={{ gridColumn: "1 / -1" }}><Form initial={{ ...EMPTY, ...a, victory: a.victory ?? "" }} campaigns={campaigns} onSave={update} onCancel={() => setEditing(null)} /></div>;
                    const won = isEarned(p);
                    const col = won ? "#facc15" : t.text4;
                    const pct = Math.min(100, (p.have / p.need) * 100);
                    return (
                        <div key={a.id} style={{ position: "relative", background: won ? "rgba(250,204,21,0.06)" : t.bg3, border: `1px solid ${won ? "rgba(250,204,21,0.45)" : t.border}`, borderRadius: 12, padding: "16px 16px 14px", display: "flex", gap: 14, boxShadow: won ? "0 0 24px rgba(250,204,21,0.08)" : "none" }}>
                            <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: won ? "radial-gradient(circle, rgba(250,204,21,0.25), transparent 70%)" : t.bg2, border: `1px solid ${won ? "rgba(250,204,21,0.5)" : t.border}`, filter: won ? "none" : "grayscale(1)", opacity: won ? 1 : 0.55 }}>{a.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                    <span style={{ fontSize: 15, color: won ? t.text1 : t.text2 }}>{a.title}</span>
                                    <span style={{ display: "flex", gap: 2 }}>
                                        <button onClick={() => setEditing(a.id)} title="Edit" style={{ background: "transparent", border: "none", color: t.text4, cursor: "pointer", fontSize: 12 }}>✎</button>
                                        <button onClick={() => remove(a.id)} title="Delete" style={{ background: "transparent", border: "none", color: t.text4, cursor: "pointer", fontSize: 12 }}>✕</button>
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5, margin: "2px 0 10px" }}>
                                    {describe(a, campaigns)}
                                    {a.victory && <span style={{ color: VICTORY_COLORS[a.victory] }}> 🏆</span>}
                                </div>
                                {a.rule === "manual" ? (
                                    <button onClick={() => toggleManual(a.id)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: won ? "rgba(250,204,21,0.12)" : "transparent", border: `1px solid ${won ? "rgba(250,204,21,0.5)" : t.border}`, color: won ? "#facc15" : t.text3 }}>{won ? "✓ Done" : "Mark as done"}</button>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ flex: 1, background: t.bg2, borderRadius: 3, height: 5, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: won ? "#facc15" : t.accent, borderRadius: 3, transition: "width 0.5s" }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: col, whiteSpace: "nowrap" }}>{Math.min(p.have, p.need)}/{p.need}</span>
                                    </div>
                                )}
                                {won && a.earnedAt && <div style={{ fontSize: 10, color: "#c8a030", marginTop: 8, letterSpacing: 1 }}>EARNED {new Date(a.earnedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
