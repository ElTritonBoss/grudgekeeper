import { useTheme } from "../context/ThemeContext";
import { isDone } from "../utils/constants";
import { ownsProduct } from "../utils/dlc";

const GAMES = [["WH1", "Warhammer I"], ["WH2", "Warhammer II"], ["WH3", "Warhammer III"]];

export default function DlcView({ products, requirements, owned, setOwned, campaigns, checked }) {
    const t = useTheme();

    const ownedCount = products.filter((p) => ownsProduct(owned, p.id)).length;
    const locked = campaigns.filter((c) => !c.owned);
    const lockedOpen = locked.filter((c) => !isDone(checked[c.lordId]));

    // Lords each product unlocks, and whether another owned product already covers them.
    const unlocks = (id) => campaigns.filter((c) => requirements[c.lordId]?.includes(id));

    const toggle = (id) => setOwned((p) => {
        const n = { ...p };
        if (ownsProduct(p, id)) n[id] = false; else delete n[id];
        return n;
    });
    const setAll = (value) => setOwned(value ? {} : Object.fromEntries(products.map((p) => [p.id, false])));

    const btn = { fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: "transparent", border: `1px solid ${t.border}`, color: t.text3 };

    return (
        <div style={{ padding: "30px 42px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8, gap: 20 }}>
                <div>
                    <div style={{ fontSize: 10, letterSpacing: 5, color: t.text4, textTransform: "uppercase", marginBottom: 6 }}>Collection</div>
                    <h2 style={{ fontSize: 26, color: t.text1, fontWeight: "normal", margin: 0 }}>My DLC</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setAll(true)} style={btn}>Tick all</button>
                    <button onClick={() => setAll(false)} style={btn}>Untick all</button>
                </div>
            </div>
            <p style={{ fontSize: 13, color: t.text3, margin: "0 0 18px", lineHeight: 1.6, maxWidth: 760 }}>
                Untick anything you don't own. Lords that need it are locked on the Roadmap, skipped by the dice and left out of your totals. Campaigns you've already finished keep counting.
            </p>

            <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 10, background: t.bg3, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
                {[
                    { label: "Owned", value: `${ownedCount}/${products.length}`, sub: "products", color: "#4ade80" },
                    { label: "Playable", value: campaigns.length - locked.length, sub: "lords", color: "#facc15" },
                    { label: "Locked", value: lockedOpen.length, sub: "lords need DLC", color: lockedOpen.length ? "#ef4444" : t.text4 },
                ].map((s, i) => (
                    <div key={s.label} style={{ padding: "9px 20px", borderLeft: i ? `1px solid ${t.border}` : "none", minWidth: 100 }}>
                        <div style={{ fontSize: 9, color: t.text4, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                            <span style={{ fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</span>
                            <span style={{ fontSize: 10, color: t.text3 }}>{s.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, alignItems: "start" }}>
                {GAMES.map(([game, label]) => (
                    <div key={game} style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 16px 8px" }}>
                        <div style={{ fontSize: 10, color: t.text4, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
                        {products.filter((p) => p.game === game).map((p) => {
                            const has = ownsProduct(owned, p.id);
                            const lords = unlocks(p.id);
                            const base = p.kind === "Base game";
                            return (
                                <div key={p.id} onClick={() => toggle(p.id)} style={{ display: "flex", gap: 10, padding: "9px 6px", borderTop: `1px solid ${t.border}`, cursor: "pointer", alignItems: "flex-start", opacity: has ? 1 : 0.6 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, border: `1px solid ${has ? "#4ade80" : t.inputBorder}`, background: has ? "rgba(74,222,128,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#4ade80" }}>{has && "✓"}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                            <span style={{ fontSize: 13, color: base ? t.text1 : t.text2, fontWeight: base ? "bold" : "normal" }}>{p.name}</span>
                                            <span style={{ fontSize: 9, color: t.text4, whiteSpace: "nowrap", letterSpacing: 1, textTransform: "uppercase", paddingTop: 3 }}>{p.kind}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: has ? t.text4 : "#ef4444", lineHeight: 1.5, marginTop: 2 }}>
                                            {!has && "🔒 "}{lords.map((c) => c.lord).join(", ")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <p style={{ fontSize: 11, color: t.text4, marginTop: 16, lineHeight: 1.6 }}>
                Some free lords unlock with any one of several products (for example Imrik comes with Warhammer II, The Queen & The Crone or The Warden & The Paunch), so unticking one pack doesn't always lock them.
            </p>
        </div>
    );
}
