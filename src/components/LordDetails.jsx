import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

function Label({ children, color }) {
    const t = useTheme();
    return <div style={{ fontSize: 9, letterSpacing: 3, color: color ?? t.text4, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

function Bullets({ lines, color }) {
    const t = useTheme();
    return (
        <div>
            {lines.map((line) => (
                <div key={line} style={{ fontSize: 12, color: t.text2, lineHeight: 1.55, paddingLeft: 12, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color }}>•</span>{line}
                </div>
            ))}
        </div>
    );
}

function Pill({ children, color }) {
    const t = useTheme();
    return <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, border: `1px solid ${color ? color + "70" : t.border}`, color: color ?? t.text3, marginLeft: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

// The older panel: units the lord's own skills buff, and legendary heroes.
function UnitsAndHeroes({ lord, details, color, showHeroes, panel, row }) {
    const t = useTheme();
    // The file lists units with their buffs; most skills hit several units, so show them per skill.
    const skills = [];
    (details.units ?? []).forEach((u) => u.buffs.forEach((b) => {
        let s = skills.find((x) => x.skill === b.skill && x.effect === b.effect);
        if (!s) skills.push(s = { skill: b.skill, effect: b.effect, units: [] });
        if (!s.units.includes(u.unit)) s.units.push(u.unit);
    }));
    const heroes = (details.heroes ?? []).filter((h) => !h.unverified);
    const possible = (details.heroes ?? []).filter((h) => h.unverified);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={panel}>
                <Label color={color}>⚒ Units {lord}'s skills buff</Label>
                {skills.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>{details.note ?? "None of this lord's own skills target specific units."}</div>}
                {skills.map((s) => (
                    <div key={s.skill + s.effect} style={row}>
                        <div style={{ fontSize: 13, color }}>{s.skill}</div>
                        <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.55, marginBottom: 4 }}>{s.effect}</div>
                        <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.6 }}>{s.units.join(" · ")}</div>
                    </div>
                ))}
            </div>
            {showHeroes && <div style={panel}>
                <Label color={color}>★ Legendary heroes</Label>
                {heroes.length === 0 && possible.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>{details.note ?? "None found for this faction."}</div>}
                {heroes.map((h) => (
                    <div key={h.name} style={row}>
                        <div style={{ fontSize: 14, color: t.text1 }}>{h.name} <span style={{ fontSize: 11, color: t.text4 }}>{h.type}</span></div>
                        {h.unlock && <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.55 }}>{h.unlock}</div>}
                    </div>
                ))}
                {possible.length > 0 && (
                    <div style={{ ...row, opacity: 0.75 }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color: t.text4, textTransform: "uppercase", marginBottom: 4 }} title="The game allows these heroes for this faction, but how they join is handled by campaign scripts the app can't read.">Possible · unlock not confirmed</div>
                        <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.6 }}>
                            {possible.map((h) => `${h.name} (${h.type})`).join(" · ")}
                        </div>
                    </div>
                )}
            </div>}
        </div>
    );
}

function Overview({ details, color, panel, row }) {
    const t = useTheme();
    const [bio, setBio] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {details.stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {Object.entries(details.stats).map(([label, value]) => (
                        <div key={label} style={{ border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 6px", textAlign: "center", background: t.altRow }}>
                            <div style={{ fontSize: 19, color: t.text1 }}>{value}</div>
                            <div style={{ fontSize: 8, letterSpacing: 1.5, color: t.text4, textTransform: "uppercase" }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}
            {(details.bio || details.blurb) && (
                <div style={{ ...panel, fontSize: 12, color: t.text3, lineHeight: 1.6 }}>
                    {details.blurb && <div style={{ marginBottom: details.bio ? 6 : 0 }}>{details.blurb}</div>}
                    {details.bio && (bio ? details.bio : `${details.bio.slice(0, 160)}${details.bio.length > 160 ? "…" : ""}`)}
                    {details.bio?.length > 160 && <span onClick={() => setBio(!bio)} style={{ color, cursor: "pointer", marginLeft: 6 }}>{bio ? "less" : "more"}</span>}
                </div>
            )}
            {details.trait && (
                <div style={panel}>
                    <Label color={color}>Lord trait · {details.trait.name}</Label>
                    {details.trait.blurb && <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.55, marginBottom: 6 }}>{details.trait.blurb}</div>}
                    <Bullets lines={details.trait.effects} color={color} />
                </div>
            )}
            {details.abilities?.length > 0 && (
                <div style={panel}>
                    <Label color={color}>Battle abilities</Label>
                    {details.abilities.map((a) => (
                        <div key={a.name} style={row}>
                            <div style={{ fontSize: 13, color }}>{a.name}<Pill>{a.kind}</Pill></div>
                            <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>{a.text}</div>
                        </div>
                    ))}
                </div>
            )}
            {details.grudges?.length > 0 && (
                <div style={panel}>
                    <Label color={color}>Starting grudges · Immortal Empires</Label>
                    {details.grudges.map((g) => (
                        <div key={g.title} style={row}>
                            <div style={{ fontSize: 13, color }}>{g.title}</div>
                            <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.55 }}>{g.text}</div>
                        </div>
                    ))}
                </div>
            )}
            {details.unlock && (
                <div style={panel}>
                    <Label color={color}>Unlocking this lord</Label>
                    <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>{details.unlock}</div>
                </div>
            )}
        </div>
    );
}

// Variants ("Longbeards (Great Weapons)") add nothing next to the plain unit already listed.
const buildAround = (own) => own.map((u) => u.unit).filter((name, i, all) => !all.slice(0, i).some((prev) => name.startsWith(`${prev} (`))).slice(0, 6);

// What to build around this lord: units buffed by his own trait, items and signature skills first.
function BestUnits({ lord, details, color, panel }) {
    const t = useTheme();
    const [open, setOpen] = useState(null);
    const units = details.bestUnits ?? [];
    const own = units.filter((u) => u.own.length > 0);
    const shared = units.filter((u) => u.own.length === 0);
    const sharedByRole = [];
    shared.forEach((u) => {
        let g = sharedByRole.find((x) => x.role === u.role);
        if (!g) sharedByRole.push(g = { role: u.role, units: [] });
        g.units.push(u);
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {own.length > 0 && (
                <div style={{ ...panel, borderColor: `${color}60` }}>
                    <Label color={color}>Build around</Label>
                    <div style={{ fontSize: 14, color: t.text1, lineHeight: 1.6 }}>{buildAround(own).join(" · ")}</div>
                </div>
            )}
            <div style={panel}>
                <Label color={color}>★ {lord}'s own bonuses</Label>
                {own.length === 0 && <div style={{ fontSize: 12, color: t.text4, fontStyle: "italic" }}>{lord}'s own trait, items and signature skills don't single out specific units. See the shared bonuses below.</div>}
                {own.map((u) => (
                    <div key={u.unit} style={{ padding: "8px 0", borderTop: `1px solid ${t.border}` }}>
                        <div onClick={() => setOpen(open === u.unit ? null : u.unit)} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontSize: 14, color: t.text1 }}>{u.unit}<Pill>{u.role}</Pill></div>
                            <div style={{ fontSize: 11, color }}>{u.own.length} {u.own.length === 1 ? "source" : "sources"} {open === u.unit ? "▾" : "▸"}</div>
                        </div>
                        <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.6 }}>{u.own.map((s) => s.source).join(" · ")}</div>
                        {open === u.unit && (
                            <div style={{ marginTop: 6 }}>
                                {u.own.map((s) => (
                                    <div key={s.from + s.source} style={{ marginBottom: 4 }}>
                                        <div style={{ fontSize: 12, color }}>{s.source}<Pill>{s.from}</Pill></div>
                                        <Bullets lines={s.effects} color={color} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {sharedByRole.length > 0 && (
                <div style={panel}>
                    <Label>Also boosted by shared skill lines</Label>
                    <div style={{ fontSize: 11, color: t.text4, lineHeight: 1.5, marginBottom: 6 }}>Every lord of this race can take these. Useful, but not what sets {lord} apart.</div>
                    {sharedByRole.map((g) => (
                        <div key={g.role} style={{ padding: "6px 0", borderTop: `1px solid ${t.border}` }}>
                            <div style={{ fontSize: 10, letterSpacing: 2, color: t.text4, textTransform: "uppercase", marginBottom: 3 }}>{g.role}</div>
                            <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.7 }}>
                                {g.units.map((u, i) => <span key={u.unit} title={u.shared.join(" · ")}>{i > 0 && " · "}{u.unit}</span>)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Items({ details, color, panel, row }) {
    const t = useTheme();
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={panel}>
                <Label color={color}>Quest items · earned at these lord ranks</Label>
                {details.items.map((i) => (
                    <div key={i.key} style={row}>
                        <div style={{ fontSize: 14, color }}>{i.name}<Pill>Rank {i.rank}</Pill><Pill>{i.battle ? "Quest battle" : "Mission"}</Pill></div>
                        {i.brief && <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.55, margin: "2px 0 4px" }}>“{i.mission}”: {i.brief.length > 190 ? `${i.brief.slice(0, 190)}…` : i.brief}</div>}
                        <Bullets lines={i.effects} color={color} />
                    </div>
                ))}
            </div>
            {details.set && (
                <div style={{ ...panel, border: `1px dashed ${color}66` }}>
                    <Label color={color}>Set bonus · {details.set.name}</Label>
                    <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.55, marginBottom: 5 }}>{details.set.pieces.join(" + ")}</div>
                    <Bullets lines={details.set.bonus} color={color} />
                </div>
            )}
            {details.gear?.length > 0 && (
                <div style={panel}>
                    <Label color={color}>Other signature gear</Label>
                    {details.gear.map((g) => (
                        <div key={g.name} style={row}>
                            <div style={{ fontSize: 13, color }}>{g.name}{g.category && <Pill>{g.category}</Pill>}</div>
                            <Bullets lines={g.effects} color={color} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SkillTree({ details, color, panel, row }) {
    const t = useTheme();
    const [showShared, setShowShared] = useState(false);
    const sharedCount = details.skills.filter((s) => s.shared).length;
    const groups = [...new Set(details.skills.map((s) => s.group))];
    return (
        <div style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Label color={color}>{details.skills.length - sharedCount} signature skills{sharedCount > 0 && ` · ${sharedCount} shared`}</Label>
                {sharedCount > 0 && <span onClick={() => setShowShared(!showShared)} style={{ fontSize: 11, color, cursor: "pointer" }}>{showShared ? "Hide" : "Show"} shared lines</span>}
            </div>
            {groups.map((g) => {
                const skills = details.skills.filter((s) => s.group === g && (showShared || !s.shared));
                if (!skills.length) return null;
                return (
                    <div key={g}>
                        <div style={{ fontSize: 10, letterSpacing: 2, color, textTransform: "uppercase", margin: "10px 0 2px" }}>{g} · {skills.length}</div>
                        {skills.map((s) => (
                            <div key={s.name} style={row}>
                                <div style={{ fontSize: 13, color: s.shared ? t.text3 : color }}>{s.name}</div>
                                <Bullets lines={s.effects} color={color} />
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

export default function LordDetails({ lord, details, color, showHeroes = true }) {
    const t = useTheme();
    const panel = { background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 9, padding: "14px 16px" };
    const row = { padding: "8px 0", borderTop: `1px solid ${t.border}` };
    const [picked, setTab] = useState(null);

    if (!details) {
        return (
            <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", justifyContent: "center" }}>
                <Label color={color}>Lord details</Label>
                <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.65 }}>
                    {lord}'s skills, items, abilities and legendary heroes come from your own copy of the game.
                    Run <code>scripts\refresh-game-data.ps1</code> once and they'll show up here. The data stays on this PC.
                </div>
            </div>
        );
    }

    const tabs = [
        details.trait || details.stats || details.abilities?.length ? ["overview", "Overview"] : null,
        details.bestUnits?.length ? ["best", "Best units"] : null,
        details.items?.length ? ["items", "Items & quests"] : null,
        details.skills?.length ? ["skills", "Skill tree"] : null,
        ["units", "Units & heroes"],
    ].filter(Boolean);
    const tab = tabs.some(([id]) => id === picked) ? picked : tabs[0][0];
    const pill = (active) => ({ fontSize: 12, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", background: active ? `${color}22` : "transparent", border: `1px solid ${active ? color + "80" : t.border}`, color: active ? color : t.text3 });

    return (
        <div>
            {details.quote && <div style={{ fontSize: 13, fontStyle: "italic", color: t.text2, lineHeight: 1.55, marginBottom: 10 }}>{details.quote}</div>}
            {tabs.length > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={pill(id === tab)}>{label}</button>)}
                </div>
            )}
            {tab === "overview" && <Overview details={details} color={color} panel={panel} row={row} />}
            {tab === "best" && <BestUnits lord={lord} details={details} color={color} panel={panel} />}
            {tab === "items" && <Items details={details} color={color} panel={panel} row={row} />}
            {tab === "skills" && <SkillTree details={details} color={color} panel={panel} row={row} />}
            {tab === "units" && <UnitsAndHeroes lord={lord} details={details} color={color} showHeroes={showHeroes} panel={panel} row={row} />}
        </div>
    );
}
