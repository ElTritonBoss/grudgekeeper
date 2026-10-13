import { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { load, save } from "../hooks/usePersist";

// The lore text comes from a file built from your own game install
// (scripts/build-unit-lore.mjs) and is kept only on this PC. The script copies
// it to the app's data folder, which the app serves at LOCAL_LORE_URL.
const STORAGE_KEY = "tww3_unitLore";
const LOCAL_LORE_URL = "/local/unit-lore.json";
const LOCAL_LORE_PATH = "%APPDATA%\\Grudgekeeper\\unit-lore.json";

const isLoreFile = (data) => data?.format === "grudgekeeper-unit-lore" && Array.isArray(data.units);

function storeLore(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch {
        return false;
    }
}

export default function Units({ races }) {
    const t = useTheme();
    const fileInput = useRef(null);
    const [lore, setLore] = useState(() => load(STORAGE_KEY, null));
    const [error, setError] = useState(null);
    const [race, setRace] = useState(null);
    const [type, setType] = useState("All");
    const [search, setSearch] = useState("");
    const [selectedKey, setSelectedKey] = useState(null);

    // Pick up a new or rebuilt lore file from the app's data folder on open.
    useEffect(() => {
        fetch(LOCAL_LORE_URL, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!isLoreFile(data) || load(STORAGE_KEY, null)?.generated === data.generated) return;
                storeLore(data);
                setLore(data);
            })
            .catch(() => {});
    }, []);

    const units = lore?.units ?? [];
    const raceColor = (name) => races.find((r) => r.race === name)?.color ?? t.accent;

    const raceNames = useMemo(() => [...new Set(units.map((u) => u.race))].sort(), [units]);
    const activeRace = race && raceNames.includes(race) ? race : raceNames[0];
    const raceUnits = units.filter((u) => u.race === activeRace);
    const types = ["All", ...new Set(raceUnits.map((u) => u.type))];
    const q = search.trim().toLowerCase();
    const shown = q
        ? units.filter((u) => u.name.toLowerCase().includes(q))
        : raceUnits.filter((u) => type === "All" || u.type === type);
    const selected = units.find((u) => u.key === selectedKey) ?? shown[0];

    const importFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        file.text().then((text) => {
            const data = JSON.parse(text);
            if (!isLoreFile(data)) {
                throw new Error("This isn't a unit lore file. Build one with scripts/build-unit-lore.mjs.");
            }
            if (!storeLore(data)) throw new Error("The file is too big to store in the app.");
            setLore(data);
            setError(null);
            setRace(null);
            setSelectedKey(null);
        }).catch((err) => setError(err.message));
    };

    const removeLore = () => {
        save(STORAGE_KEY, null);
        setLore(null);
    };

    const button = { fontSize: 12, padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: t.accentGlow, border: `1px solid ${t.accent}60`, color: t.accent, fontFamily: "inherit" };
    const hiddenInput = <input ref={fileInput} type="file" accept=".json,application/json" onChange={importFile} style={{ display: "none" }} />;

    if (!units.length) {
        return (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <div style={{ maxWidth: 520, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                    <div style={{ fontSize: 36 }}>📜</div>
                    <div style={{ fontSize: 20, color: t.text1 }}>Unit Lore</div>
                    <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.7 }}>
                        The unit descriptions come from your own copy of the game, so they aren't shipped with Grudgekeeper.
                        See <code>docs/unit-lore.md</code> to build <code>unit-lore.json</code> with RPFM. The build
                        script puts it in <code>{LOCAL_LORE_PATH}</code>, and this page loads it from there by itself.
                        It stays on this PC. You can also load a file by hand.
                    </div>
                    <button onClick={() => fileInput.current?.click()} style={button}>Load lore file</button>
                    {error && <div style={{ fontSize: 12, color: "#e06050" }}>{error}</div>}
                    {hiddenInput}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${t.border}`, overflowY: "auto", padding: "16px 0", background: t.sidebar }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: t.text4, textTransform: "uppercase", padding: "0 18px 8px" }}>Races</div>
                {raceNames.map((r) => {
                    const isAct = !q && r === activeRace;
                    return (
                        <button key={r} onClick={() => { setRace(r); setType("All"); setSearch(""); setSelectedKey(null); }} style={{ width: "100%", background: isAct ? `${raceColor(r)}18` : "transparent", border: "none", borderLeft: `3px solid ${isAct ? raceColor(r) : "transparent"}`, cursor: "pointer", padding: "7px 18px", textAlign: "left", fontFamily: "inherit", fontSize: 12, color: isAct ? raceColor(r) : t.text3, display: "flex", justifyContent: "space-between" }}>
                            <span>{r}</span>
                            <span style={{ color: t.text5, fontSize: 10 }}>{units.filter((u) => u.race === r).length}</span>
                        </button>
                    );
                })}
            </div>

            <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setSelectedKey(null); }} placeholder="Search all units..." style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text2, outline: "none", fontFamily: "inherit" }} />
                    {!q && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {types.map((ty) => (
                                <button key={ty} onClick={() => { setType(ty); setSelectedKey(null); }} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: type === ty ? t.accentGlow : "transparent", border: `1px solid ${type === ty ? t.accent + "70" : t.border}`, color: type === ty ? t.accent : t.text4 }}>{ty}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {shown.map((u) => {
                        const isSel = selected?.key === u.key;
                        return (
                            <div key={u.key} onClick={() => setSelectedKey(u.key)} style={{ padding: "9px 16px", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: isSel ? t.accentGlow : "transparent", borderLeft: `3px solid ${isSel ? t.accent : "transparent"}` }}>
                                <div style={{ fontSize: 13, color: isSel ? t.accent : t.text2 }}>{u.name}</div>
                                <div style={{ fontSize: 10, color: t.text5 }}>{q ? `${u.race} · ${u.type}` : u.type}</div>
                            </div>
                        );
                    })}
                    {!shown.length && <div style={{ padding: 16, fontSize: 12, color: t.text4 }}>No units found.</div>}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "26px 34px" }}>
                {selected && (
                    <div style={{ maxWidth: 720 }}>
                        <div style={{ fontSize: 9, letterSpacing: 4, color: raceColor(selected.race), textTransform: "uppercase", marginBottom: 5 }}>{selected.race} · {selected.type}</div>
                        <div style={{ fontSize: 24, color: t.text1, marginBottom: 16 }}>{selected.name}</div>
                        {selected.summary && (
                            <div style={{ fontSize: 13, color: t.text3, fontStyle: "italic", lineHeight: 1.7, marginBottom: 18, paddingLeft: 12, borderLeft: `2px solid ${t.border}`, whiteSpace: "pre-line" }}>{selected.summary}</div>
                        )}
                        <div style={{ fontSize: 15, color: t.text2, lineHeight: 1.85, whiteSpace: "pre-line" }}>{selected.lore}</div>
                        <a href={`https://totalwarwarhammer.fandom.com/wiki/Special:Search?query=${encodeURIComponent(selected.name)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 22, fontSize: 12, color: t.accent }}>Read more on the wiki ↗</a>
                    </div>
                )}
                <div style={{ marginTop: 40, paddingTop: 14, borderTop: `1px solid ${t.border}`, display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: t.text5 }}>
                    <span style={{ flex: 1 }}>{units.length} units from your game files{lore.generated ? `, built ${new Date(lore.generated).toLocaleDateString()}` : ""}</span>
                    <button onClick={() => fileInput.current?.click()} style={{ ...button, fontSize: 11, padding: "5px 12px" }}>Load new file</button>
                    <button onClick={removeLore} style={{ ...button, fontSize: 11, padding: "5px 12px", background: "transparent", color: t.text4, border: `1px solid ${t.border}` }}>Remove</button>
                    {error && <span style={{ color: "#e06050" }}>{error}</span>}
                </div>
                {hiddenInput}
            </div>
        </div>
    );
}
