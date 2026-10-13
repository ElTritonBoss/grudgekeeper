import { useState, useEffect } from "react";
import { ThemeCtx, DARK, LIGHT, DISPLAY_FONT } from "./context/ThemeContext";
import usePersist from "./hooks/usePersist";
import useCSV, {
  buildCampaigns,
  buildRoadmap,
  buildRaces,
  buildStyles
} from "./hooks/useCSV";
import { isDone } from "./utils/constants";
import { PROGRESS_KEY } from "./utils/progress";

import Dashboard from "./views/Dashboard";
import RoadmapView from "./views/RoadmapView";
import AllFactions from "./views/AllFactions";
import FactionBrowser from "./views/FactionBrowser";
import MyList from "./views/MyList";
import Notes from "./views/Notes";
import RandomPicker from "./components/RandomPicker";
import Statistics from "./views/Statistic";
import Units from "./views/Units";
import NavIcon, { Emblem } from "./components/NavIcon";
import factionTheme from "./utils/factionTheme";
import Motif from "./components/Motif";

export default function App() {

  const [isDark, setIsDark] = usePersist("tww3_dark", true);
  const [view, setView] = usePersist("tww3_view", "dashboard");
  const [checked, setChecked] = usePersist(PROGRESS_KEY, {});
  const [activeTier, setActiveTier] = usePersist("tww3_activeTier", 1);
  const [activeCampaign, setActiveCampaign] = usePersist("tww3_activeCampaign", null);
  const [activeSince, setActiveSince] = usePersist("tww3_activeSince", null);
  const [sessionLog, setSessionLog] = usePersist("tww3_sessionLog", {});
  const [customList, setCustomList] = usePersist("tww3_customList", []);
  const [globalNotes, setGlobalNotes] = usePersist("tww3_notes", []);
  const [factionColours, setFactionColours] = usePersist("tww3_factionTheme", true);
  const [showPicker, setShowPicker] = useState(false);

  // Remember when the current active campaign was started, for the Dashboard.
  useEffect(() => {
    if (activeCampaign && activeSince?.id !== activeCampaign) setActiveSince({ id: activeCampaign, at: Date.now() });
  }, [activeCampaign]);

  const { data: roadmapCsv, loading: loadingRoadmap } = useCSV("/data/roadmap.csv");
  const { data: stylesCsv, loading: loadingStyles } = useCSV("/data/styles.csv");
  const { data: racesCsv, loading: loadingRaces } = useCSV("/data/races.csv");

  const styles = loadingStyles ? [] : buildStyles(stylesCsv);
  const campaigns = loadingRoadmap || loadingRaces ? [] : buildCampaigns(roadmapCsv, racesCsv, styles);
  const roadmap = buildRoadmap(campaigns, checked);
  const races = loadingRaces ? [] : buildRaces(racesCsv);

  const activeFaction = campaigns.find((e) => e.id === activeCampaign);
  // While a campaign is active the whole app takes on the colours of that lord's
  // crest (falling back to the race colour where the crest has none on file).
  const crest = activeFaction ? [activeFaction.crest?.[0] ?? activeFaction.raceColor, activeFaction.crest?.[1]] : [];
  const theme = factionTheme(isDark ? DARK : LIGHT, factionColours ? crest[0] : null, factionColours ? crest[1] : null);
  const crestColor = theme.faction ? theme.accent : (activeFaction?.raceColor || "#5a9a40");
  const motifRace = factionColours && activeFaction ? activeFaction.race : null;
  const done = campaigns.filter((c) => isDone(checked[c.lordId])).length;
  const total = campaigns.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const nav = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "roadmap", icon: "⬡", label: "Roadmap" },
    { id: "allfactions", icon: "≡", label: "All Factions" },
    { id: "browser", icon: "⚔", label: "Faction Browser" },
    { id: "mylist", icon: "🗒", label: "My List", badge: customList.filter((e) => !e.done).length },
    { id: "notes", icon: "✎", label: "Notes", badge: globalNotes.length || null },
    { id: "statistics", icon: "🗠", label: "Statistics" },
    { id: "units", icon: "📜", label: "Unit Lore" }
  ];

  if (loadingRoadmap || loadingRaces) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Palatino, serif", color: theme.text3, fontSize: 16 }}>
        Loading data...
      </div>
    );
  }

  const bgGradient = theme.faction
    ? `radial-gradient(ellipse 70% 60% at 30% 0%, ${theme.glowA} 0%, transparent 60%), radial-gradient(ellipse 60% 55% at 18% 55%, ${theme.glowB} 0%, transparent 55%), radial-gradient(ellipse 45% 50% at 85% 30%, ${theme.glowB} 0%, transparent 55%)`
    : isDark
    ? "radial-gradient(ellipse 70% 60% at 30% 0%, rgba(150,70,15,0.16) 0%, transparent 60%), radial-gradient(ellipse 60% 55% at 18% 55%, rgba(110,30,8,0.20) 0%, transparent 55%), radial-gradient(ellipse 45% 50% at 85% 30%, rgba(70,22,95,0.14) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 65% 95%, rgba(90,45,8,0.14) 0%, transparent 55%)"
    : "radial-gradient(ellipse 70% 60% at 30% 0%, rgba(255,240,200,0.45) 0%, transparent 60%), radial-gradient(ellipse 60% 55% at 18% 40%, rgba(180,130,20,0.12) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 80% 70%, rgba(120,80,10,0.08) 0%, transparent 50%)";
  // A fine grain over the whole window so the backdrop reads as worn parchment, not flat colour.
  const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.85 0 0 0 0 0.65 0 0 0 0 0.35 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
  const vignette = isDark
    ? "radial-gradient(ellipse 120% 100% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)"
    : "radial-gradient(ellipse 120% 100% at 50% 40%, transparent 60%, rgba(60,40,10,0.18) 100%)";

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ height: "100vh", width: "100vw", display: "flex", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: theme.text1, overflow: "hidden", background: theme.bg, backgroundImage: bgGradient, position: "relative", "--gk-accent-rgb": theme.accentRgb, transition: "background-color 0.6s" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: grain, opacity: isDark ? 0.09 : 0.14, mixBlendMode: isDark ? "screen" : "multiply", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: vignette, pointerEvents: "none", zIndex: 0 }} />

        <div style={{ width: 265, flexShrink: 0, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", background: theme.sidebar, backdropFilter: "blur(12px)", boxShadow: isDark ? "4px 0 24px rgba(0,0,0,0.45)" : "4px 0 18px rgba(60,40,10,0.12)", zIndex: 1 }}>

          {motifRace && <Motif race={motifRace} color={theme.accent2} opacity={0.5} />}
          <div style={{ padding: motifRace ? "14px 18px 18px" : "22px 18px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <Emblem size={48} color={theme.accent} highlight={theme.faction ? theme.accent2 : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 7.5, letterSpacing: 1.6, color: theme.text4, textTransform: "uppercase", marginBottom: 5, whiteSpace: "nowrap" }}>Total War: Warhammer III</div>
              <div style={{ fontFamily: DISPLAY_FONT, fontSize: 16.5, letterSpacing: 1.2, fontWeight: 700, lineHeight: 1, textTransform: "uppercase", background: theme.faction ? `linear-gradient(180deg, ${theme.accent2} 0%, ${theme.accent2} 30%, ${theme.accent} 100%)` : isDark ? "linear-gradient(180deg, #fbe3a0 0%, #d9a21c 55%, #9a6410 100%)" : "linear-gradient(180deg, #8a5a08 0%, #6a4204 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: isDark ? `drop-shadow(0 1px 6px rgba(${theme.accentRgb},0.3))` : "none" }}>Grudgekeeper</div>
              <div style={{ fontSize: 8.5, letterSpacing: 2.4, color: theme.text4, textTransform: "uppercase", marginTop: 6, fontStyle: "italic", whiteSpace: "nowrap" }}>Campaign Chronicles</div>
            </div>
          </div>
          <Divider color={theme.faction ? theme.accent2 : theme.accent} />

          <div style={{ padding: "14px 20px 16px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: theme.text4, textTransform: "uppercase" }}>Campaigns won</span>
              <span style={{ fontSize: 12, color: theme.text2 }}><span className="gk-display" style={{ color: theme.accent, fontSize: 15 }}>{done}</span> / {total}</span>
            </div>
            <div style={{ position: "relative", background: isDark ? "rgba(0,0,0,0.45)" : "rgba(60,40,10,0.15)", borderRadius: 4, height: 7, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)", border: `1px solid ${theme.border}` }}>
              <div style={{ height: "100%", width: `${Math.max(pct, done ? 2 : 0)}%`, background: theme.faction ? `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` : `linear-gradient(90deg, ${isDark ? "#7a3408" : "#8a4010"}, ${isDark ? "#c06818" : "#c07030"}, ${isDark ? "#f0c040" : "#d4a030"})`, boxShadow: `0 0 10px rgba(${theme.accentRgb},0.55)`, transition: "width 0.5s", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: theme.text4, marginTop: 6 }}>{pct}% of the Roadmap conquered</div>
          </div>

          <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
            {nav.map((item) => {
              const on = view === item.id;
              return (
                <button key={item.id} onClick={() => setView(item.id)} className={`gk-nav${on ? " gk-nav-active" : ""}`} style={{ "--gk-hover": theme.text1, width: "100%", background: on ? `linear-gradient(90deg, ${theme.accent}30 0%, ${theme.accent}0d 70%, transparent 100%)` : "transparent", border: "none", borderLeft: on ? `3px solid ${theme.accent}` : "3px solid transparent", boxShadow: on ? `inset 3px 0 12px -6px ${theme.accent}` : "none", cursor: "pointer", padding: "10px 20px 10px 19px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                  <span style={{ display: "flex", color: on ? theme.accent : theme.text3 }}><NavIcon id={item.id} fallback={item.icon} /></span>
                  <span style={{ fontSize: 13, letterSpacing: 0.3, color: on ? theme.text1 : theme.text2, flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span style={{ fontSize: 10, minWidth: 20, textAlign: "center", padding: "1px 6px", borderRadius: 10, background: `${theme.accent}22`, color: theme.accent, border: `1px solid ${theme.accent}55` }}>{item.badge}</span>}
                </button>
              );
            })}
          </nav>

          {view === "roadmap" && (
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8, paddingBottom: 8 }}>
              {roadmap.map((r) => {
                const isAct = activeTier === r.tier;
                return (
                  <button key={r.tier} onClick={() => setActiveTier(r.tier)} style={{ width: "100%", background: isAct ? r.tierBg : "transparent", border: "none", borderLeft: isAct ? `3px solid ${r.tierColor}` : "3px solid transparent", cursor: "pointer", padding: "8px 20px", display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: isAct ? r.tierBg : "transparent", border: `1px solid ${isAct ? r.tierColor + "60" : theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: isAct ? r.tierColor : theme.text4, flexShrink: 0 }}>{r.tier}</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 1, color: isAct ? r.tierColor : theme.text3, textTransform: "uppercase" }}>{r.tierLabel}</div>
                      <div style={{ fontSize: 9, color: theme.text5 }}>{r.entries.length} {r.entries.length === 1 ? "faction" : "factions"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeFaction && (
            <button onClick={() => setView("dashboard")} title="Open the Dashboard" style={{ margin: "10px 12px", padding: "10px 12px", borderRadius: 10, display: "flex", gap: 10, alignItems: "center", textAlign: "left", cursor: "pointer", fontFamily: "inherit", border: `1px solid ${crestColor}55`, background: `linear-gradient(135deg, ${crestColor}26 0%, ${crestColor}08 70%)`, boxShadow: `0 0 18px ${crestColor}14` }}>
              <SideCrest src={activeFaction.icon} name={activeFaction.faction} color={crestColor} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: isDark ? "#7ac050" : "#3a6a1a", textTransform: "uppercase", marginBottom: 2 }}>▶ Now campaigning</div>
                <div className="gk-title" style={{ fontSize: 13, color: theme.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeFaction.faction}</div>
                <div style={{ fontSize: 10, color: isDark ? theme.accent2 : theme.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeFaction.lord}</div>
              </div>
            </button>
          )}

          <div style={{ padding: "12px 14px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: 8, alignItems: "center" }}>

            <button
              onClick={() => setShowPicker(true)}
              title="Pick a random faction"
              style={{ flex: 1, fontSize: 12, letterSpacing: 0.5, padding: "8px 8px", borderRadius: 8, cursor: "pointer", background: `linear-gradient(180deg, ${theme.accent}33 0%, ${theme.accent}14 100%)`, border: `1px solid ${theme.accent}70`, boxShadow: `0 0 14px ${theme.accent}1f, inset 0 1px 0 ${theme.accent}40`, color: theme.text1, fontFamily: "inherit", textAlign: "center" }}
            >
              🎲 Random
            </button>

            <button
              onClick={() => setFactionColours(!factionColours)}
              title={factionColours ? "Faction colours on: the app follows your active campaign's colours" : "Faction colours off"}
              style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: factionColours ? theme.accentGlow : "transparent", border: `1px solid ${factionColours ? theme.accent + "70" : theme.border}`, fontSize: 14, lineHeight: 1, flexShrink: 0, opacity: factionColours ? 1 : 0.6 }}
            >
              🎨
            </button>

            <button
              onClick={() => setIsDark(!isDark)}
              title={isDark ? "Light Mode" : "Dark Mode"}
              style={{ padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: "transparent", border: `1px solid ${theme.border}`, fontSize: 14, color: theme.text3, lineHeight: 1, flexShrink: 0 }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>


        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 1 }}>

          {showPicker && (
            <RandomPicker
              entries={roadmap.flatMap((r) => r.entries).filter((e) => !e.complete)}
              onConfirm={(entry) => { setActiveCampaign(entry.id); setShowPicker(false); setView("roadmap"); }}
              onClose={() => setShowPicker(false)}
            />
          )}
          {motifRace && <div style={{ flexShrink: 0, borderBottom: `1px solid ${theme.border}` }}><Motif race={motifRace} color={theme.accent2} opacity={0.35} /></div>}
          <div key={view} className="gk-view" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {view === "dashboard" && <Dashboard roadmap={roadmap} campaigns={campaigns} checked={checked} setChecked={setChecked} activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign} activeSince={activeSince} sessionLog={sessionLog} setSessionLog={setSessionLog} onRandom={() => setShowPicker(true)} onOpenRoadmap={(tier) => { setActiveTier(tier); setView("roadmap"); }} />}
          {view === "roadmap" && <RoadmapView roadmap={roadmap} checked={checked} setChecked={setChecked} activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign} activeTier={activeTier} setActiveTier={setActiveTier} />}
          {view === "allfactions" && <AllFactions campaigns={campaigns} checked={checked} setChecked={setChecked} activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign} />}
          {view === "browser" && <FactionBrowser races={races} customList={customList} setCustomList={setCustomList} />}
          {view === "mylist" && <MyList customList={customList} setCustomList={setCustomList} />}
          {view === "notes" && <Notes notes={globalNotes} setNotes={setGlobalNotes} />}
          {view === "statistics" && <Statistics campaigns={campaigns} checked={checked} customList={customList} />}
          {view === "units" && <Units races={races} />}
          </div>
        </div>

      </div>
    </ThemeCtx.Provider>
  );
}
// Thin gold rule with a diamond in the middle, under the sidebar title.
function Divider({ color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${color}70)` }} />
      <div style={{ width: 6, height: 6, transform: "rotate(45deg)", border: `1px solid ${color}`, background: `${color}40` }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${color}70)` }} />
    </div>
  );
}

function SideCrest({ src, name, color }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} style={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 8px ${color}66)` }} />;
  return <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: `1px solid ${color}90`, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color }}>{name?.[0]}</div>;
}
