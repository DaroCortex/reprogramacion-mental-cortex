import React, { useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = [
  { id: "done", label: "Hecho", color: "good" },
  { id: "partial", label: "Parcial", color: "warn" },
  { id: "missed", label: "No hecho", color: "bad" },
  { id: "na", label: "No aplica", color: "neutral" },
  { id: "pending", label: "Pendiente", color: "neutral" }
];

const STATUS_MULT = {
  done: 1,
  partial: 0.5,
  missed: 0,
  pending: 0,
  na: 0
};

const STUDENT_TABS = [
  { id: "daily", label: "Check\ndiario" },
  { id: "today", label: "Rutina\nde hoy" },
  { id: "score", label: "Score\ny nivel" },
  { id: "week", label: "Semana" }
];

const WEEK_TIERS = [
  { id: "bronce", label: "Bronce", minAvg: 55, rewardId: "unlock_audio_base_2", rewardText: "Nuevo audio disponible" },
  { id: "plata", label: "Plata", minAvg: 70, rewardId: "unlock_mini_reto_7d", rewardText: "Reto desbloqueado" },
  { id: "oro", label: "Oro", minAvg: 82, rewardId: "unlock_feedback_auto", rewardText: "Feedback semanal listo" },
  { id: "elite", label: "Elite", minAvg: 92, rewardId: "unlock_comodin_plus", rewardText: "Comodin ganado" }
];

const LEVELS = [
  { id: "base", label: "Base", minXp: 0, benefit: "Reto de 3 minutos (1/semana)" },
  { id: "estable", label: "Estable", minXp: 450, benefit: "Modo simple (3 checks por 1 dia)" },
  { id: "claro", label: "Claro", minXp: 900, benefit: "1 check extra opcional sin castigo" },
  { id: "avanzado", label: "Avanzado", minXp: 1500, benefit: "Comodin semanal extra" }
];

const BASE_STUDENTS = [
  {
    id: "jaime",
    name: "Jaime",
    coachNotes: "Escala empresa + baja ansiedad + mas presencia familiar",
    templates: [
      { id: "j-resp", text: "Respiracion guiada (27 min)", category: "Salud", critical: true, points: 12 },
      { id: "j-kpi", text: "Revision de KPIs sin microcontrol", category: "Sistema", critical: true, points: 10 },
      { id: "j-del", text: "Delegue 1 tarea real", category: "Liderazgo", critical: true, points: 11 },
      { id: "j-fam", text: "Tiempo presente con familia", category: "Familia", critical: true, points: 12 },
      { id: "j-rest", text: "Dormi en horario objetivo", category: "Recuperacion", critical: false, points: 8 },
      { id: "j-audio", text: "Use transcripcion de reuniones", category: "Sistema", critical: false, points: 8 }
    ]
  },
  {
    id: "clori",
    name: "Clori",
    coachNotes: "Ventas con estructura + equilibrio emocional + foco",
    templates: [
      { id: "c-resp", text: "Respiracion matutina (30 min)", category: "Salud", critical: true, points: 12 },
      { id: "c-rap", text: "Aplique guion de venta (rapport + silencio)", category: "Ventas", critical: true, points: 11 },
      { id: "c-kpi", text: "Complete KPIs del dia", category: "Sistema", critical: true, points: 10 },
      { id: "c-log", text: "Registro animo/energia", category: "Salud", critical: true, points: 10 },
      { id: "c-cut", text: "Corte de trabajo en horario", category: "Recuperacion", critical: false, points: 8 },
      { id: "c-scr", text: "Grabe 1 llamada para revisar", category: "Sistema", critical: false, points: 8 }
    ]
  }
];

function dateKey(input = new Date()) {
  if (typeof input === "string") return input;
  return input.toISOString().slice(0, 10);
}

function shiftDate(key, days) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function formatDate(key) {
  const d = new Date(`${key}T12:00:00`);
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
}

function isSunday(key) {
  const d = new Date(`${key}T12:00:00`);
  return d.getDay() === 0;
}

function isBreathingTask(item) {
  return /respiraci/i.test(String(item?.text || ""));
}

function toId(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

function loadStudents() {
  const raw = localStorage.getItem("wm-students");
  if (!raw) return BASE_STUDENTS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : BASE_STUDENTS;
  } catch {
    return BASE_STUDENTS;
  }
}

function loadStudentStore(studentId) {
  const raw = localStorage.getItem(`wm-store-${studentId}`);
  if (!raw) return { days: {}, activeTemplateIds: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      days: parsed.days || {},
      activeTemplateIds: Array.isArray(parsed.activeTemplateIds) ? parsed.activeTemplateIds : null
    };
  } catch {
    return { days: {}, activeTemplateIds: null };
  }
}

function parseChecklistFromReportText(rawText) {
  const text = rawText
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[•●✓]/g, "-");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 12 && l.length < 140);

  const keywordLines = lines.filter((line) =>
    /(objetivo|protocolo|debes|necesitas|practica|kpi|ventas|respiraci|registro|sueno|familia|deleg|llamada|revisi|ayuno|rutina)/i.test(
      line
    )
  );

  const bulletLines = lines.filter((line) => /^(-|\d+\.|\*|\u2022)\s*/.test(line));

  const merged = [...keywordLines, ...bulletLines]
    .map((line) =>
      line
        .replace(/^(-|\d+\.|\*|\u2022)\s*/, "")
        .replace(/^[•●✓]\s*/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length > 12 && line.length < 95);

  const uniq = [];
  const seen = new Set();
  for (const line of merged) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(line);
    }
  }

  const scored = uniq
    .map((line) => {
      let score = 0;
      if (/respiraci|sueno|ansiedad|registro|emocional/i.test(line)) score += 4;
      if (/kpi|metrica|llamada|ventas|guion|deleg/i.test(line)) score += 4;
      if (/familia|presente|descanso/i.test(line)) score += 3;
      if (/hoy|diario|cada|manana/i.test(line)) score += 2;
      return { text: line, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return scored.map((item, i) => {
    const lower = item.text.toLowerCase();
    const category =
      /ventas|llamada|guion|kpi|metrica|cliente/.test(lower)
        ? "Sistema"
        : /familia|hijo|esposa|presencia/.test(lower)
          ? "Familia"
          : /sueno|descanso|ayuno|energia|registro/.test(lower)
            ? "Recuperacion"
            : "Salud";

    return {
      id: `pdf-${toId(item.text)}-${i}`,
      text: item.text,
      category,
      critical: i < 6,
      points: i < 6 ? 11 : 8
    };
  });
}

function pickFiveTemplates(templates, dayKey) {
  if (!templates.length) return [];

  const critical = templates.filter((t) => t.critical);
  const optional = templates.filter((t) => !t.critical);

  const dayHash = Number(dayKey.replace(/-/g, ""));
  const rotate = (arr, n) => {
    if (!arr.length) return [];
    const offset = n % arr.length;
    return arr.slice(offset).concat(arr.slice(0, offset));
  };

  const criticalRotated = rotate(critical, dayHash % Math.max(critical.length, 1));
  const optionalRotated = rotate(optional, dayHash % Math.max(optional.length, 1));

  const selected = [...criticalRotated.slice(0, 3), ...optionalRotated.slice(0, 2)];
  const breathing = templates.find((item) => isBreathingTask(item));
  if (breathing && !selected.find((item) => item.id === breathing.id)) {
    selected[0] = breathing;
  }
  if (selected.length < 5) {
    const filler = rotate(templates, dayHash % Math.max(templates.length, 1));
    for (const t of filler) {
      if (selected.find((s) => s.id === t.id)) continue;
      selected.push(t);
      if (selected.length === 5) break;
    }
  }
  return selected.slice(0, 5);
}

function pointsForItem(item) {
  const base = item.points ?? 10;
  if (item.status === "done") return base;
  if (item.status === "partial") return Math.round(base * STATUS_MULT.partial);
  if (item.status === "missed") {
    if (!item.critical) return 0;
    return -Math.min(4, Math.round(base * 0.25));
  }
  return 0;
}

function scoreDay(day, dayKeyForRules = "") {
  const items = day?.items ?? [];
  const sunday = isSunday(dayKeyForRules);
  const normalized = items.map((item) => {
    if (!sunday) return item;
    if (isBreathingTask(item)) return item;
    return { ...item, status: "na", critical: false };
  });

  const valid = normalized.filter((item) => item.status !== "na");
  const possible = valid.reduce((sum, item) => sum + (item.points ?? 10), 0);

  const earnedRaw = normalized.reduce((sum, item) => sum + pointsForItem(item), 0);
  const critical = normalized.filter((item) => item.critical);
  const criticalDone = critical.filter((item) => item.status === "done" || item.status === "partial").length;
  const doneOrPartial = normalized.filter((item) => item.status === "done" || item.status === "partial").length;

  let bonus = 0;
  if (doneOrPartial >= 1) bonus += 2;
  if (critical.length && criticalDone === critical.length) bonus += 8;
  if (doneOrPartial === normalized.length && normalized.length >= 5) bonus += 12;

  const earned = earnedRaw + bonus;
  const scorePct = possible ? Math.max(0, Math.min(100, Math.round((earned / possible) * 100))) : 0;
  const dayValid = scorePct >= 70 && criticalDone >= Math.min(2, critical.length);

  return {
    possible,
    earnedRaw,
    bonus,
    earned,
    scorePct,
    dayValid,
    done: normalized.filter((i) => i.status === "done").length,
    doneOrPartial,
    total: normalized.length,
    criticalDone,
    criticalTotal: critical.length,
    sundayAdjusted: sunday
  };
}

function weekStartKey(key) {
  const d = new Date(`${key}T12:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return dateKey(d);
}

function weekSummary(daysArray) {
  const scored = daysArray.filter(Boolean).map(({ day, key }) => scoreDay(day, key));
  const avg = scored.length ? Math.round(scored.reduce((s, d) => s + d.scorePct, 0) / scored.length) : 0;
  const tier = [...WEEK_TIERS].reverse().find((t) => avg >= t.minAvg) ?? null;
  const validDays = scored.filter((d) => d.dayValid).length;
  return { avg, tier, validDays };
}

function computeGamification(daysMap, endKey) {
  const keys = Object.keys(daysMap)
    .filter((k) => k <= endKey)
    .sort();

  let xp = 0;
  let streak = 0;
  let wildcards = 0;
  const dayResults = {};
  const weekBuckets = new Map();

  keys.forEach((key, index) => {
    const scored = scoreDay(daysMap[key], key);
    dayResults[key] = { ...scored, protectedByWildcard: false };
    xp += Math.max(0, scored.earned);

    const wk = weekStartKey(key);
    if (!weekBuckets.has(wk)) weekBuckets.set(wk, []);
    weekBuckets.get(wk).push(scored);

    if (scored.dayValid) {
      streak += 1;
    } else if (wildcards > 0) {
      wildcards -= 1;
      streak += 1;
      dayResults[key].protectedByWildcard = true;
    } else {
      streak = 0;
    }

    const nextKey = keys[index + 1];
    const nextWk = nextKey ? weekStartKey(nextKey) : null;
    if (wk !== nextWk) {
      const weekScored = weekBuckets.get(wk) || [];
      const weekAvg = weekScored.length
        ? Math.round(weekScored.reduce((s, d) => s + d.scorePct, 0) / weekScored.length)
        : 0;
      if (weekAvg >= 92) wildcards = Math.min(3, wildcards + 2);
      else if (weekAvg >= 70) wildcards = Math.min(2, wildcards + 1);
    }
  });

  return { xp, streak, wildcards, dayResults };
}

function levelFromXp(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) if (xp >= lvl.minXp) current = lvl;
  const next = LEVELS.find((l) => l.minXp > current.minXp) ?? null;
  return { current, nextAt: next?.minXp ?? null };
}

function levelProgressPct(xp, levelInfo) {
  if (!levelInfo.nextAt) return 100;
  const start = levelInfo.current.minXp;
  const span = levelInfo.nextAt - start;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((xp - start) / span) * 100)));
}

function tierProgressPct(avg, currentTier, nextTier) {
  if (!nextTier) return 100;
  const start = currentTier ? currentTier.minAvg : 0;
  const span = nextTier.minAvg - start;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((avg - start) / span) * 100)));
}

function DailyGoalsModule({ allowAdmin = false, fixedStudent = null }) {
  const fixedId = fixedStudent?.id ? toId(fixedStudent.id) : "";
  const fixedName = fixedStudent?.name || "Estudiante";
  const cloudSlug = fixedStudent?.slug || "";
  const cloudToken = fixedStudent?.token || "";
  const modeKey = fixedId ? `wm-mode-${fixedId}` : "wm-mode";
  const studentsKey = fixedId ? `wm-students-${fixedId}` : "wm-students";
  const activeKey = fixedId ? `wm-active-student-${fixedId}` : "wm-active-student";
  const [mode, setMode] = useState(allowAdmin ? (localStorage.getItem(modeKey) || "student") : "student");
  const [students, setStudents] = useState(() => {
    if (fixedId) {
      return [{
        id: fixedId,
        name: fixedName,
        coachNotes: "Plan personal diario",
        templates: [
          { id: `${fixedId}-resp`, text: "Respiracion de reprogramacion mental", category: "Salud", critical: true, points: 12 },
          { id: `${fixedId}-kpi`, text: "Revision de KPIs", category: "Sistema", critical: true, points: 10 },
          { id: `${fixedId}-foco`, text: "Tarea principal completada", category: "Sistema", critical: true, points: 10 },
          { id: `${fixedId}-familia`, text: "Momento de presencia personal/familiar", category: "Familia", critical: false, points: 8 },
          { id: `${fixedId}-registro`, text: "Registro breve emocional", category: "Salud", critical: false, points: 8 }
        ]
      }];
    }
    const raw = localStorage.getItem(studentsKey);
    if (!raw) return loadStudents();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : loadStudents();
    } catch {
      return loadStudents();
    }
  });
  const [activeStudentId, setActiveStudentId] = useState(fixedId || localStorage.getItem(activeKey) || "jaime");
  const [store, setStore] = useState(() => loadStudentStore(fixedId || localStorage.getItem(activeKey) || "jaime"));
  const [tab, setTab] = useState("daily");
  const [focusDate, setFocusDate] = useState(dateKey());
  const [message, setMessage] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);

  const [newStudentName, setNewStudentName] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [reportPreview, setReportPreview] = useState([]);
  const [backupText, setBackupText] = useState("");
  const [recentItemId, setRecentItemId] = useState("");

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];

  const templates = useMemo(() => {
    if (!activeStudent) return [];
    if (!store.activeTemplateIds) return activeStudent.templates;
    return activeStudent.templates.filter((t) => store.activeTemplateIds.includes(t.id));
  }, [activeStudent, store.activeTemplateIds]);

  const ensureDay = React.useCallback(
    (baseStore, dayKey) => {
      if (baseStore.days[dayKey]) return baseStore;

      const templatesForDay = pickFiveTemplates(templates, dayKey);
      const items = templatesForDay.map((t) => ({
        id: `${t.id}-${dayKey}`,
        templateId: t.id,
        text: t.text,
        category: t.category,
        critical: t.critical,
        points: t.points,
        status: "pending"
      }));

      return {
        ...baseStore,
        days: {
          ...baseStore.days,
          [dayKey]: { createdAt: new Date().toISOString(), items }
        }
      };
    },
    [templates]
  );

  useEffect(() => {
    if (!allowAdmin) return;
    localStorage.setItem(modeKey, mode);
  }, [mode, modeKey, allowAdmin]);

  useEffect(() => {
    if (fixedId) return;
    localStorage.setItem(studentsKey, JSON.stringify(students));
  }, [students, studentsKey, fixedId]);

  useEffect(() => {
    if (fixedId) return;
    localStorage.setItem(activeKey, activeStudentId);
    setStore(loadStudentStore(activeStudentId));
  }, [activeStudentId, activeKey, fixedId]);

  useEffect(() => {
    let next = ensureDay(store, focusDate);
    next = ensureDay(next, shiftDate(focusDate, -1));
    if (next !== store) setStore(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate, ensureDay]);

  useEffect(() => {
    localStorage.setItem(`wm-store-${activeStudentId}`, JSON.stringify(store));
  }, [activeStudentId, store]);

  useEffect(() => {
    if (!cloudSlug || !cloudToken) return;
    let cancelled = false;
    const loadCloud = async () => {
      setCloudLoading(true);
      try {
        const response = await fetch(`/api/daily/data?slug=${encodeURIComponent(cloudSlug)}&token=${encodeURIComponent(cloudToken)}`);
        if (!response.ok) throw new Error("Sin cloud");
        const data = await response.json();
        const payload = data?.data || {};
        if (cancelled) return;
        if (payload?.store) setStore(payload.store);
        if (payload?.templates || payload?.studentName) {
          setStudents((prev) =>
            prev.map((item) =>
              item.id !== activeStudentId
                ? item
                : {
                    ...item,
                    name: payload.studentName || item.name,
                    coachNotes: payload.coachNotes || item.coachNotes,
                    templates: Array.isArray(payload.templates) && payload.templates.length
                      ? payload.templates
                      : item.templates
                  }
            )
          );
        }
      } catch {
        // fallback local
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    };
    loadCloud();
    return () => {
      cancelled = true;
    };
  }, [cloudSlug, cloudToken, activeStudentId]);

  useEffect(() => {
    if (!cloudSlug || !cloudToken || cloudLoading) return;
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/daily/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: cloudSlug,
            token: cloudToken,
            payload: {
              studentId: activeStudentId,
              studentName: activeStudent?.name || fixedName,
              coachNotes: activeStudent?.coachNotes || "",
              templates: activeStudent?.templates || [],
              store
            }
          })
        });
      } catch {
        // silent save retry on next change
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [store, activeStudent, activeStudentId, cloudSlug, cloudToken, cloudLoading, fixedName]);

  const yesterdayKey = shiftDate(focusDate, -1);
  const todayDay = store.days[focusDate] || { items: [] };
  const yesterdayDay = store.days[yesterdayKey] || { items: [] };

  const gamification = useMemo(() => computeGamification(store.days, yesterdayKey), [store.days, yesterdayKey]);

  const weeklyStats = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, i) => shiftDate(yesterdayKey, -i));
    const days = keys.map((k) => ({ key: k, day: store.days[k] })).filter((item) => Boolean(item.day));
    if (!days.length) return { avg: 0, points: 0, done: 0, total: 0, validDays: 0, tier: null };
    const wk = weekSummary(days);
    const scored = days.map((d) => scoreDay(d.day, d.key));
    return {
      avg: wk.avg,
      points: scored.reduce((s, d) => s + Math.max(0, d.earned), 0),
      done: scored.reduce((s, d) => s + d.doneOrPartial, 0),
      total: scored.reduce((s, d) => s + d.total, 0),
      validDays: wk.validDays,
      tier: wk.tier
    };
  }, [store.days, yesterdayKey]);

  const xp = gamification.xp;
  const level = levelFromXp(xp);
  const yesterdayStats = gamification.dayResults[yesterdayKey] || scoreDay(yesterdayDay, yesterdayKey);
  const nextTier = WEEK_TIERS.find((t) => t.minAvg > (weeklyStats.tier?.minAvg ?? 0)) || null;
  const lvlPct = levelProgressPct(xp, level);
  const tierPct = tierProgressPct(weeklyStats.avg, weeklyStats.tier, nextTier);

  const setStatus = (itemId, status) => {
    setRecentItemId(itemId);
    setTimeout(() => setRecentItemId(""), 380);
    setStore((prev) => {
      const day = prev.days[yesterdayKey];
      if (!day) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [yesterdayKey]: {
            ...day,
            items: day.items.map((item) => (item.id === itemId ? { ...item, status } : item))
          }
        }
      };
    });
  };

  const addCustomTodayItem = () => {
    const text = prompt("Escribe una ayuda diaria corta para hoy");
    if (!text || text.trim().length < 4) return;

    setStore((prev) => {
      const day = prev.days[focusDate] || { createdAt: new Date().toISOString(), items: [] };
      const item = {
        id: `custom-${Date.now()}`,
        templateId: null,
        text: text.trim(),
        category: "Personal",
        critical: false,
        points: 8,
        status: "pending"
      };
      return {
        ...prev,
        days: {
          ...prev.days,
          [focusDate]: { ...day, items: [...day.items, item].slice(0, 5) }
        }
      };
    });
  };

  const removeTodayItem = (id) => {
    setStore((prev) => {
      const day = prev.days[focusDate];
      if (!day) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [focusDate]: {
            ...day,
            items: day.items.filter((item) => item.id !== id)
          }
        }
      };
    });
  };

  const createStudent = () => {
    const name = newStudentName.trim();
    if (!name) return;
    const idBase = toId(name) || `alumno-${Date.now()}`;
    const id = students.find((s) => s.id === idBase) ? `${idBase}-${Date.now().toString().slice(-4)}` : idBase;

    const newStudent = {
      id,
      name,
      coachNotes: "Plan inicial pendiente",
      templates: [
        { id: `${id}-resp`, text: "Respiracion matutina", category: "Salud", critical: true, points: 10 },
        { id: `${id}-check`, text: "Revision del dia anterior", category: "Sistema", critical: true, points: 10 },
        { id: `${id}-sueno`, text: "Horario de descanso cumplido", category: "Recuperacion", critical: false, points: 8 },
        { id: `${id}-foco`, text: "Tarea principal completada", category: "Sistema", critical: true, points: 10 },
        { id: `${id}-registro`, text: "Registro breve de animo", category: "Salud", critical: false, points: 8 }
      ]
    };

    setStudents((prev) => [...prev, newStudent]);
    setActiveStudentId(id);
    setNewStudentName("");
    setMessage("Alumno creado.");
  };

  const readFileLooseText = async (file) => {
    const buffer = await file.arrayBuffer();
    const latin = new TextDecoder("latin1").decode(buffer);
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return latin.length > utf8.length ? latin : utf8;
  };

  const loadReportAndGenerate = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeStudent) return;

    setUploadedFileName(file.name);
    setMessage("Leyendo informe...");

    try {
      const text = await readFileLooseText(file);
      const generated = parseChecklistFromReportText(text);
      if (!generated.length) {
        setMessage("No pude extraer acciones claras. Usa un PDF con texto o TXT.");
        setReportPreview([]);
        return;
      }

      setReportPreview(generated);

      setStudents((prev) =>
        prev.map((s) =>
          s.id === activeStudent.id
            ? {
                ...s,
                templates: generated.map((g, i) => ({
                  ...g,
                  id: `${s.id}-tpl-${i + 1}`
                })),
                coachNotes: `Checklist generado desde ${file.name}`
              }
            : s
        )
      );

      setStore({ days: {}, activeTemplateIds: null });
      setFocusDate(dateKey());
      setMessage("Checklist generado y aplicado al alumno.");
    } catch {
      setMessage("No pude procesar el archivo. Prueba con otro PDF o TXT.");
    }
  };

  const backupProgress = () => {
    const payload = {
      studentId: activeStudentId,
      exportedAt: new Date().toISOString(),
      store
    };
    const json = JSON.stringify(payload, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
    setBackupText(json);
    setMessage("Copia de seguridad creada.");
  };

  const restoreProgress = () => {
    try {
      const parsed = JSON.parse(backupText);
      if (!parsed.store?.days) throw new Error("Formato");
      setStore({
        days: parsed.store.days || {},
        activeTemplateIds: Array.isArray(parsed.store.activeTemplateIds)
          ? parsed.store.activeTemplateIds
          : null
      });
      setMessage("Progreso restaurado.");
    } catch {
      setMessage("No pude restaurar. Revisa el texto de la copia.");
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Metas Diarias</p>
          <h1>{mode === "admin" ? "Panel Administrador" : "Panel Estudiante"}</h1>
          <p className="subtitle">
            {mode === "admin"
              ? "Carga informes y genera checklist asistido sin abrumar"
              : "Solo 5 acciones claras por dia para mantener foco"}
          </p>
        </div>
        <div className="topbar-controls">
          {allowAdmin && (
            <label className="control">
              Vista
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="student">Estudiante</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          )}

          <label className="control">
            Alumno
            <select
              value={activeStudentId}
              onChange={(e) => setActiveStudentId(e.target.value)}
              disabled={Boolean(fixedId)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {mode === "admin" && (
        <main className="admin-layout">
          <section className="panel">
            <header className="panel-head">
              <h3>1) Crear alumno</h3>
            </header>
            <div className="add-row">
              <input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Nombre del alumno"
              />
              <button type="button" onClick={createStudent}>
                Crear
              </button>
            </div>
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>2) Cargar informe (PDF/TXT)</h3>
            </header>
            <p className="hint">
              Subes el informe y genero checklist diario automatico. Si el PDF es escaneado, usa TXT o PDF con texto.
            </p>
            <input type="file" accept=".pdf,.txt" onChange={loadReportAndGenerate} />
            {uploadedFileName ? <p className="hint">Archivo: {uploadedFileName}</p> : null}
            {reportPreview.length ? (
              <ul className="plan-list">
                {reportPreview.slice(0, 8).map((item) => (
                  <li key={item.id} className="plan-row text-only">
                    <div>
                      <strong>{item.text}</strong>
                      <small>
                        {item.category} {item.critical ? "• Critico" : ""}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>3) Respaldo simple</h3>
            </header>
            <p className="hint">Evito terminos tecnicos: guardar copia / recuperar copia.</p>
            <div className="test-actions two">
              <button type="button" onClick={backupProgress}>
                Guardar copia
              </button>
              <button type="button" className="ghost" onClick={restoreProgress}>
                Recuperar copia
              </button>
            </div>
            <textarea
              rows={6}
              value={backupText}
              onChange={(e) => setBackupText(e.target.value)}
              placeholder="Aqui aparece tu copia, tambien puedes pegar una para recuperar"
            />
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>Plan actual del alumno</h3>
            </header>
            <p className="hint">{activeStudent?.coachNotes}</p>
            <ul className="plan-list">
              {activeStudent?.templates.slice(0, 12).map((tpl) => (
                <li key={tpl.id} className="plan-row text-only">
                  <div>
                    <strong>{tpl.text}</strong>
                    <small>
                      {tpl.category} • {tpl.points} pts {tpl.critical ? "• Critico" : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      )}

      {mode === "student" && (
        <main className="content">
          <section className="hero-cards">
            <article className="hero-card">
              <h2>{activeStudent?.name}</h2>
              <p>{activeStudent?.coachNotes}</p>
              <small>Menos carga, mas consistencia: 5 checks diarios.</small>
            </article>
            <article className="hero-card score-card">
              <h2>{weeklyStats.avg}%</h2>
              <p>Promedio semanal</p>
              <small>
                Racha: {gamification.streak} dias • Comodines: {gamification.wildcards}
              </small>
            </article>
          </section>

          <section className="gamify-strip">
            <article className="game-card">
              <h4>Nivel {level.current.label}</h4>
              <p>{xp} XP</p>
              <div className="progress-track">
                <span className="progress-fill" style={{ width: `${lvlPct}%` }} />
              </div>
              <small>
                {level.nextAt ? `Faltan ${level.nextAt - xp} XP para subir` : "Nivel maximo"}
              </small>
            </article>

            <article className="game-card">
              <h4>Tier semanal</h4>
              <p>{weeklyStats.tier ? weeklyStats.tier.label : "Sin tier"}</p>
              <div className="progress-track tier">
                <span className="progress-fill tier" style={{ width: `${tierPct}%` }} />
              </div>
              <small>{nextTier ? `Siguiente: ${nextTier.label} (${nextTier.minAvg}%)` : "Tier maximo"}</small>
            </article>

            <article className="game-card">
              <h4>Proteccion de racha</h4>
              <p>{gamification.wildcards} comodines</p>
              <small>Se usan solo si un dia no llega a valido.</small>
            </article>
          </section>

          <nav className="tabbar" aria-label="Secciones estudiante">
            {STUDENT_TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                className={tab === t.id ? "tab active" : "tab"}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "daily" && (
            <section className="panel">
              <header className="panel-head">
                <h3>Check diario (ayer)</h3>
                <span>{formatDate(yesterdayKey)}</span>
              </header>
              <p className="hint">Tocas un cuadro y se pinta. El texto del check siempre esta visible.</p>
              <ul className="check-list">
                {yesterdayDay.items.map((item) => (
                  <li
                    key={item.id}
                    className={
                      recentItemId === item.id
                        ? "check-row updated"
                        : item.status === "done" || item.status === "partial"
                          ? "check-row doneish"
                          : "check-row"
                    }
                  >
                    <div className="check-meta">
                      <strong>{item.text}</strong>
                      <small>
                        {item.category} {item.critical ? "• Critico" : ""}
                      </small>
                    </div>
                    <div className="status-grid squares-5">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={
                            item.status === s.id
                              ? `status square active ${s.color} selected`
                              : "status square"
                          }
                          onClick={() => setStatus(item.id, s.id)}
                          title={s.label}
                        >
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="panel-foot">
                <div>
                  <strong>{yesterdayStats.earned}</strong>
                  <span>Puntos</span>
                </div>
                <div>
                  <strong>{yesterdayStats.scorePct}%</strong>
                  <span>Score</span>
                </div>
                <div>
                  <strong>
                    {yesterdayStats.criticalDone}/{yesterdayStats.criticalTotal}
                  </strong>
                  <span>Criticos</span>
                </div>
              </footer>
              <p className="hint">
                Bonus: {yesterdayStats.bonus} pts • Base: {yesterdayStats.earnedRaw} pts •{" "}
                {yesterdayStats.dayValid
                  ? "Dia valido para racha"
                  : yesterdayStats.protectedByWildcard
                    ? "Dia protegido con comodin"
                    : "Dia no valido"}
              </p>
            </section>
          )}

          {tab === "today" && (
            <section className="panel">
              <header className="panel-head">
                <h3>Rutina de hoy</h3>
                <span>{formatDate(focusDate)}</span>
              </header>
              <p className="hint">Hoy tienes un maximo de 5 acciones para no saturarte.</p>
              <div className="test-actions two">
                <button type="button" onClick={addCustomTodayItem}>
                  Agregar ayuda de hoy
                </button>
              </div>
              <ul className="check-list compact">
                {todayDay.items.map((item) => (
                  <li key={item.id} className="check-row compact">
                    <div className="check-meta">
                      <strong>{item.text}</strong>
                      <small>{item.category}</small>
                    </div>
                    <button type="button" className="ghost" onClick={() => removeTodayItem(item.id)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === "score" && (
            <section className="panel">
              <header className="panel-head">
                <h3>Score y nivel</h3>
              </header>
              <div className="metric-grid">
                <article>
                  <h4>XP total</h4>
                  <p>{xp}</p>
                </article>
                <article>
                  <h4>Nivel</h4>
                  <p>{level.current.label}</p>
                </article>
                <article>
                  <h4>Promedio</h4>
                  <p>{weeklyStats.avg}%</p>
                </article>
                <article>
                  <h4>Completados</h4>
                  <p>
                    {weeklyStats.done}/{weeklyStats.total}
                  </p>
                </article>
              </div>
              <p className="hint">
                Beneficio actual: {level.current.benefit}
              </p>
              <div className="level-road">
                {LEVELS.map((lvl) => (
                  <div key={lvl.id} className={xp >= lvl.minXp ? "level-pill on" : "level-pill"}>
                    <strong>{lvl.label}</strong>
                    <small>{lvl.minXp}+ XP</small>
                  </div>
                ))}
              </div>
              <p className="hint">
                {level.nextAt ? `Siguiente nivel en ${level.nextAt - xp} XP` : "Ya estas en nivel maximo"}
              </p>
            </section>
          )}

          {tab === "week" && (
            <section className="panel">
              <header className="panel-head">
                <h3>Semana y desbloqueos</h3>
              </header>
              <p className="hint">
                Dias validos: {weeklyStats.validDays}/7 • Tier semanal:{" "}
                {weeklyStats.tier ? weeklyStats.tier.label : "Sin tier"}
              </p>
              <ul className="unlock-list">
                {WEEK_TIERS.map((u) => {
                  const on = weeklyStats.avg >= u.minAvg;
                  return (
                    <li key={u.id} className={on ? "unlock on" : "unlock"}>
                      <div>
                        <strong>{u.label}</strong>
                        <small>{u.rewardText}</small>
                      </div>
                      <span>{u.minAvg}%</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      )}

      {mode === "student" ? (
        <div className="wildcard-fab">
          <span>Comodines</span>
          <strong>{gamification.wildcards}</strong>
        </div>
      ) : null}

      {message ? <p className="flash">{message}</p> : null}
    </div>
  );
}

export default DailyGoalsModule;
