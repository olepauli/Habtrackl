import { useState, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const EMOJIS = ["💪","🏃","🧘","🚴","🏊","📚","✍️","🥗","💧","😴","🧠","🎯","🎸","🌿","🩺","🏋️","☀️","🧹","🎨","🔥"];
const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];

const C = {
  bg:       "#0d0d10",
  surface:  "#16161d",
  surface2: "#1f1f28",
  surface3: "#272733",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.13)",
  text:     "#eeeef4",
  muted:    "#7a7a90",
  accent:   "#4ade80",
  amber:    "#fbbf24",
  blue:     "#60a5fa",
  purple:   "#a78bfa",
  pink:     "#f472b6",
  danger:   "#f87171",
  gold:     "#f59e0b",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const dateStr  = (d) => d.toISOString().split("T")[0];

function getWeekDates() {
  const d = new Date();
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(d);
    dt.setDate(d.getDate() - dow + i);
    return dateStr(dt);
  });
}

function calcStreak(completions) {
  let streak = 0;
  const d = new Date();
  if (!completions[todayStr()]) d.setDate(d.getDate() - 1);
  while (true) {
    const key = dateStr(d);
    if (!completions[key]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function completionPct(habit) {
  const created = new Date(habit.createdAt);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  created.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((today - created) / 86400000) + 1);
  const done = Object.values(habit.completions).filter(Boolean).length;
  return Math.round((done / totalDays) * 100);
}

function getPastDates(n = 21) {
  const d = new Date();
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(d);
    dt.setDate(d.getDate() - i);
    return dateStr(dt);
  });
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(",");
}

// ─── Achievements ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  {
    id: "first_check", emoji: "🌱", name: "Erster Schritt", color: C.accent,
    desc: "Ersten Habit einmal abhaken",
    check: (h) => h.some(x => Object.values(x.completions).some(Boolean)),
  },
  {
    id: "streak_3", emoji: "🔥", name: "Auf Kurs", color: C.amber,
    desc: "3 Tage Streak bei einem Habit",
    check: (h) => h.some(x => calcStreak(x.completions) >= 3),
  },
  {
    id: "week_warrior", emoji: "⚔️", name: "Wochenkämpfer", color: C.blue,
    desc: "7 Tage in Folge mind. 3 Habits erledigt",
    check: (h) => {
      if (h.length < 3) return false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (h.filter(x => x.completions[dateStr(d)]).length < 3) return false;
      }
      return true;
    },
  },
  {
    id: "perfect_week", emoji: "✨", name: "Perfekte Woche", color: C.purple,
    desc: "7 Tage lang alle Habits erledigt",
    check: (h) => {
      if (h.length === 0) return false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (!h.every(x => x.completions[dateStr(d)])) return false;
      }
      return true;
    },
  },
  {
    id: "streak_21", emoji: "🏃", name: "Halbmarathon", color: C.pink,
    desc: "21 Tage Streak bei einem Habit",
    check: (h) => h.some(x => calcStreak(x.completions) >= 21),
  },
  {
    id: "streak_30", emoji: "👑", name: "Ausdauer-König", color: C.gold,
    desc: "30 Tage Streak bei einem Habit",
    check: (h) => h.some(x => calcStreak(x.completions) >= 30),
  },
  {
    id: "five_habits", emoji: "📦", name: "Vielsammler", color: C.blue,
    desc: "5 oder mehr Habits angelegt",
    check: (h) => h.length >= 5,
  },
  {
    id: "consistency_50", emoji: "💯", name: "Konsistenz 50%", color: C.accent,
    desc: "Bei einem Habit mind. 50% Abschlussrate",
    check: (h) => h.some(x => completionPct(x) >= 50),
  },
  {
    id: "consistency_80", emoji: "🏆", name: "Spitzenklasse", color: C.gold,
    desc: "Mind. 80% Abschlussrate (nach 7+ Tagen)",
    check: (h) => h.some(x => {
      const c = new Date(x.createdAt); const t = new Date();
      t.setHours(0,0,0,0); c.setHours(0,0,0,0);
      return Math.round((t - c) / 86400000) >= 6 && completionPct(x) >= 80;
    }),
  },
];

// ─── Default habits ────────────────────────────────────────────────────────────
const TODAY0 = todayStr();
const defaultHabits = [
  { id: "1", name: "Training / Sport",    emoji: "🏃", completions: {}, createdAt: TODAY0 },
  { id: "2", name: "Wasser trinken (2L)", emoji: "💧", completions: {}, createdAt: TODAY0 },
  { id: "3", name: "Lesen (30 Min)",      emoji: "📚", completions: {}, createdAt: TODAY0 },
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function HabitTracker() {
  const [habits, setHabits] = useState(() => {
    try {
      const raw = localStorage.getItem("habits_v3");
      if (raw) return JSON.parse(raw).map(h => ({ ...h, createdAt: h.createdAt || TODAY0 }));
    } catch {}
    return defaultHabits;
  });
  const [view,       setView]       = useState("dashboard");
  const [showModal,  setShowModal]  = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newEmoji,   setNewEmoji]   = useState("💪");

  const today     = todayStr();
  const weekDates = getWeekDates();

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get("habits_v3");
        if (res?.value) setHabits(JSON.parse(res.value).map(h => ({ ...h, createdAt: h.createdAt || TODAY0 })));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("habits_v3", JSON.stringify(habits)); } catch {}
    try { window.storage?.set("habits_v3", JSON.stringify(habits)); } catch {}
  }, [habits]);

  const toggle = (id) => setHabits(h => h.map(x =>
    x.id !== id ? x : { ...x, completions: { ...x.completions, [today]: !x.completions[today] } }
  ));
  const remove = (id) => setHabits(h => h.filter(x => x.id !== id));
  const add = () => {
    if (!newName.trim()) return;
    setHabits(h => [...h, { id: Date.now().toString(), name: newName.trim(), emoji: newEmoji, completions: {}, createdAt: today }]);
    setNewName(""); setNewEmoji("💪"); setShowModal(false);
  };

  const doneToday   = habits.filter(h => h.completions[today]).length;
  const totalStreak = habits.reduce((s, h) => s + calcStreak(h.completions), 0);
  const unlockedAch = ACHIEVEMENTS.filter(a => a.check(habits)).length;
  const dayName     = new Date().toLocaleDateString("de-DE", { weekday: "long" });
  const dateFull    = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long" });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: 600, fontFamily: "'Segoe UI', system-ui, sans-serif", borderRadius: 16, overflow: "hidden", position: "relative" }}>

      {/* HEADER */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "18px 22px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>
            Habit<span style={{ color: C.accent }}>.</span>Track
          </span>
          <span style={{ fontSize: 11, color: C.muted, background: C.surface2, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.border}` }}>
            {dayName}, {dateFull}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { val: `${doneToday}/${habits.length}`, lbl: "Heute erledigt", col: C.accent },
            { val: `🔥 ${totalStreak}`,             lbl: "Streak-Tage",   col: C.amber  },
            { val: `🏅 ${unlockedAch}/${ACHIEVEMENTS.length}`, lbl: "Achievements", col: C.purple },
          ].map(({ val, lbl, col }) => (
            <div key={lbl} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "dashboard",    label: "📋 Dashboard"    },
            { id: "achievements", label: "🏅 Achievements" },
            { id: "log",          label: "📅 Verlauf"      },
          ].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{
              flex: 1, padding: "7px 4px", border: "none", borderRadius: 8, cursor: "pointer",
              fontSize: 11, fontWeight: 700,
              background: view === tab.id ? C.accent : C.surface2,
              color: view === tab.id ? "#000" : C.muted,
              transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {view === "dashboard" && (
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.9 }}>Meine Habits</span>
            <button onClick={() => setShowModal(true)} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 8, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ＋ Hinzufügen
            </button>
          </div>

          {habits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 5 }}>Noch keine Habits</div>
              <div style={{ fontSize: 12 }}>Klicke auf "Hinzufügen" und starte jetzt.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {habits.map(hab => {
                const streak  = calcStreak(hab.completions);
                const isDone  = !!hab.completions[today];
                const pct     = completionPct(hab);
                const created = new Date(hab.createdAt); const now = new Date();
                now.setHours(0,0,0,0); created.setHours(0,0,0,0);
                const totalDays = Math.round((now - created) / 86400000) + 1;
                const doneDays  = Object.values(hab.completions).filter(Boolean).length;
                const barColor  = pct >= 70 ? C.accent : pct >= 40 ? C.amber : C.muted;

                return (
                  <div key={hab.id} style={{ background: isDone ? "rgba(74,222,128,0.05)" : C.surface, border: `1px solid ${isDone ? C.accent : C.border}`, borderRadius: 12, padding: "13px 15px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 20, width: 38, height: 38, borderRadius: 9, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${C.border}` }}>
                        {hab.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hab.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                          {streak > 0
                            ? <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>🔥 {streak} {streak === 1 ? "Tag" : "Tage"}</span>
                            : <span style={{ fontSize: 11, color: C.muted }}>Kein Streak</span>}
                          <span style={{ width: 1, height: 10, background: C.border2, display: "inline-block" }} />
                          <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{pct}% <span style={{ color: C.muted, fontWeight: 400 }}>({doneDays}/{totalDays}d)</span></span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                        <button onClick={() => toggle(hab.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${isDone ? C.accent : C.border2}`, background: isDone ? C.accent : "transparent", cursor: "pointer", fontSize: 15, color: isDone ? "#000" : C.muted }}>
                          {isDone ? "✓" : "○"}
                        </button>
                        <button onClick={() => remove(hab.id)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.muted, fontSize: 13 }}>
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Mini completion bar */}
                    <div style={{ height: 3, background: C.surface2, borderRadius: 2, margin: "10px 0 8px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: pct + "%", background: barColor, borderRadius: 2, transition: "width 0.5s ease" }} />
                    </div>

                    {/* Week dots */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {weekDates.map((date, i) => {
                        const done = !!hab.completions[date];
                        const isT  = date === today;
                        const fut  = date > today;
                        return (
                          <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ fontSize: 9, color: C.muted }}>{DAYS[i]}</div>
                            <div style={{ width: 26, height: 8, borderRadius: 4, background: done ? C.accent : "transparent", border: done ? "none" : isT ? `1.5px solid ${C.accent}` : `1px ${fut ? "dashed" : "solid"} ${C.border2}`, opacity: fut ? 0.4 : 1 }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENTS ──────────────────────────────────────────────────── */}
      {view === "achievements" && (
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 14 }}>
            🏅 {unlockedAch} / {ACHIEVEMENTS.length} freigeschaltet
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {ACHIEVEMENTS.map(ach => {
              const unlocked = ach.check(habits);
              return (
                <div key={ach.id} style={{
                  background: unlocked ? `rgba(${hexToRgb(ach.color)},0.07)` : C.surface,
                  border: `1px solid ${unlocked ? ach.color : C.border}`,
                  borderRadius: 12, padding: "13px 15px",
                  display: "flex", alignItems: "center", gap: 13,
                  opacity: unlocked ? 1 : 0.52,
                }}>
                  <div style={{ fontSize: 26, width: 46, height: 46, borderRadius: 12, background: unlocked ? `rgba(${hexToRgb(ach.color)},0.15)` : C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${unlocked ? ach.color : C.border}`, filter: unlocked ? "none" : "grayscale(1)" }}>
                    {ach.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: unlocked ? C.text : C.muted }}>{ach.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ach.desc}</div>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: unlocked ? ach.color : C.surface2, border: unlocked ? "none" : `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: unlocked ? 14 : 16, color: unlocked ? "#000" : C.muted, fontWeight: 700, flexShrink: 0 }}>
                    {unlocked ? "✓" : "🔒"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOG / VERLAUF ─────────────────────────────────────────────────── */}
      {view === "log" && (
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 14 }}>
            📅 Verlauf — letzte 21 Tage
          </div>
          {habits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: C.muted, fontSize: 13 }}>Keine Habits vorhanden.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {getPastDates(21).map(date => {
                const activeHabits = habits.filter(h => h.createdAt <= date);
                const doneHabits   = habits.filter(h => h.completions[date]);
                const dayPct       = activeHabits.length > 0 ? Math.round((doneHabits.length / activeHabits.length) * 100) : null;
                const isToday      = date === today;
                const dayLabel     = new Date(date + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short" });
                const dateLbl      = new Date(date + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });
                const barColor     = dayPct == null ? C.muted : dayPct >= 80 ? C.accent : dayPct >= 50 ? C.amber : dayPct > 0 ? C.danger : C.surface3;

                return (
                  <div key={date} style={{ background: isToday ? "rgba(74,222,128,0.04)" : C.surface, border: `1px solid ${isToday ? C.accent : C.border}`, borderRadius: 11, padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Date */}
                      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{dayLabel}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? C.accent : C.text }}>{dateLbl}</div>
                        {isToday && <div style={{ fontSize: 9, color: C.accent, fontWeight: 700 }}>HEUTE</div>}
                      </div>
                      {/* Habit emojis */}
                      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {habits.map(h => {
                          const active = h.createdAt <= date;
                          const done   = !!h.completions[date];
                          return (
                            <span key={h.id} title={h.name} style={{ fontSize: 16, filter: done ? "none" : "grayscale(1)", opacity: !active ? 0.1 : done ? 1 : 0.25 }}>
                              {h.emoji}
                            </span>
                          );
                        })}
                      </div>
                      {/* % */}
                      {dayPct !== null && (
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{dayPct}%</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{doneHabits.length}/{activeHabits.length}</div>
                        </div>
                      )}
                    </div>
                    {dayPct !== null && (
                      <div style={{ height: 3, background: C.surface2, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: dayPct + "%", background: barColor, borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ADD MODAL ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 22, width: 340, maxWidth: "94%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Neue Gewohnheit</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Name</label>
              <input
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: C.text, outline: "none", boxSizing: "border-box" }}
                placeholder="z.B. 30 Min laufen …"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && add()}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Emoji</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setNewEmoji(em)} style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${newEmoji === em ? C.accent : C.border}`, background: newEmoji === em ? "rgba(74,222,128,0.13)" : C.surface2, cursor: "pointer", fontSize: 18 }}>{em}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: `1px solid ${C.border2}`, background: "transparent", color: C.muted, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Abbrechen</button>
              <button onClick={add} disabled={!newName.trim()} style={{ flex: 1, padding: 10, border: "none", background: newName.trim() ? C.accent : "rgba(74,222,128,0.25)", color: "#000", borderRadius: 8, cursor: newName.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(",");
}
