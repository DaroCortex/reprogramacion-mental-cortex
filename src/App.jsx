import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DailyGoalsModule from "./modules/daily/DailyGoalsModule";

const DEFAULT_CONFIG = {
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  recoverySeconds: 15,
  cycles: 3,
  breathStyle: "activation",
  audioVolume: 0.8,
  bosqueVolume: 0.5,
  ambientSound: "bosque",
  septasyncTrack: "none",
  septasyncVolume: 0.5,
  reverbMix: 0.12,
  reverbMode: "soft"
};

const PHASE_LABELS = {
  idle: "Listo para iniciar",
  breathing: "Audio de reprogramación mental",
  apnea: "Apnea",
  recovery: "Recuperación",
  complete: "Sesión completada"
};

const TICK_MS = 100;
const DOUBLE_TAP_MS = 280;
const NOSTRIL_PREVIEW_MS = 500;
const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;
const STOP_HOLD_MS = 1000;
const FINALIZE_HOLD_MS = 1500;
const PRE_APNEA_BREATHS_LEFT = 1;
const ALERT_WARNING_HOURS = 48;
const ALERT_CRITICAL_HOURS = 72;
const SEGUIMIENTO_DASHBOARD_URL = "https://seguimiento-academia-v2-m4j7pg92s-darocortexs-projects.vercel.app/";

const SYSTEM_AUDIO = {
  respirax1: { slug: "respira" },
  bosque7: { slug: "bosq" },
  oceano: { slug: "oceano", token: "0b1c639be3bfbd85ce0b03878cfe2da0" },
  inalamos: { slug: "inala" },
  septasyncBalance: { slug: "balance", token: "feac0b11ec4cc1075e8d3cab8820da64" },
  septasyncGamma: { slug: "gamma", token: "fab74156451bda36e14983914723b1cc" },
  septasyncTrance: { slug: "trance", token: "3d662b5c21e6ed1373a269ee865a4193" }
};

const SPEED_OPTIONS = [
  { id: "rapida", label: "Rápida 1.5s", value: 1.5 },
  { id: "normal", label: "Normal 2s", value: 2 },
  { id: "lenta", label: "Lenta 3s", value: 3 }
];
const BREATH_STYLE_OPTIONS = [
  { id: "activation", label: "Activacion" },
  { id: "reset", label: "Reset" },
  { id: "comfort", label: "Confort" }
];

const BREATHS_OPTIONS = [36, 42, 48];
const CYCLES_OPTIONS = [3, 5, 8, 15];
const REVERB_MODE_OPTIONS = [
  { id: "off", label: "Off" },
  { id: "soft", label: "Suave" },
  { id: "camera", label: "Camara" }
];
const PRACTICE_OPTIONS = [
  { id: "reprogramacion", label: "Practica de Reprogramacion mental", enabled: true },
  { id: "metas", label: "Metas Diarias", enabled: true },
  { id: "colores", label: "Practica de visualizacion de colores", enabled: false },
  { id: "remota", label: "Practica de vision remota", enabled: false },
  { id: "meditacion", label: "Practica de meditacion", enabled: false },
  { id: "telekinesis", label: "Practica de telekinesis", enabled: false },
  { id: "magia", label: "Sesion de magia blanca", enabled: false }
];

const MS_PER_HOUR = 1000 * 60 * 60;
const hasColorPracticeAccess = (studentItem) => Boolean(studentItem?.features?.colorVisionEnabled);

const toIsoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeRoundArray = (value, limit = 5) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .slice(0, limit)
    .map((item) => (Number.isFinite(Number(item)) ? Number(item) : 0));
};

const clampPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const getAmbientUrlFromMap = (map, ambientSound) => {
  if (ambientSound === "none") return "";
  return map?.[ambientSound] || "";
};

const getSeptasyncUrlFromMap = (map, septasyncTrack) => {
  if (septasyncTrack === "none") return "";
  return map?.[septasyncTrack] || "";
};

const getSlugFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("s");
  if (querySlug) return querySlug.trim();

  const path = window.location.pathname;
  if (path.startsWith("/s/")) {
    const raw = path.split("/")[2] || "";
    return raw.trim();
  }

  const cleaned = path.replace(/^\//, "").trim();
  return cleaned.length ? cleaned : "";
};

const getTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("t") || params.get("token");
  return token ? token.trim() : "";
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();

const withGeneratedSlugs = (items) => {
  const seen = new Map();
  return items.map((item) => {
    const base = item.slug ? slugify(item.slug) : slugify(item.name || "");
    const safeBase = base || "estudiante";
    const count = (seen.get(safeBase) || 0) + 1;
    seen.set(safeBase, count);
    const slug = count === 1 ? safeBase : `${safeBase}-${count}`;
    return { ...item, slug };
  });
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getYesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const getNostrilState = (style, breathNumber) => {
  const index = Math.max(1, breathNumber) - 1;
  if (style === "comfort") {
    const sequence = ["both", "both", "both", "left", "left", "left", "right", "right", "right"];
    return sequence[index % sequence.length];
  }
  if (style === "reset") {
    // Inspirado en ciclos alternos tipo nadi shodhana para reset mental.
    const sequence = ["left", "right", "left", "right", "both", "both"];
    return sequence[index % sequence.length];
  }
  return "both";
};

const getNostrilHint = (nostrilState) => {
  if (nostrilState === "left") return "Fosa izquierda";
  if (nostrilState === "right") return "Fosa derecha";
  return "Ambas fosas";
};

const fetchJsonWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const buildImpulseResponse = (audioContext, seconds = 1.4, decay = 2.2) => {
  const rate = audioContext.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = audioContext.createBuffer(2, length, rate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      // Cola de reverb suave, más intensa al inicio y difuminada al final.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
};

export default function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("rmcortex_theme") || "light"
  );
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [slug] = useState(getSlugFromLocation());
  const [token] = useState(getTokenFromLocation());
  const [searchTerm, setSearchTerm] = useState("");
  const [adminPassword, setAdminPassword] = useState(
    sessionStorage.getItem("rmcortex_admin_pw") || ""
  );
  const [adminStatus, setAdminStatus] = useState("idle");
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminFile, setAdminFile] = useState(null);
  const [adminLink, setAdminLink] = useState("");
  const [adminView, setAdminView] = useState("students");
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminConfirmation, setNewAdminConfirmation] = useState("");
  const [newAdminConfirmedTwice, setNewAdminConfirmedTwice] = useState(false);
  const [adminManagerMessage, setAdminManagerMessage] = useState("");
  const [adminBridgeMessage, setAdminBridgeMessage] = useState("");
  const [adminBridgeLoading, setAdminBridgeLoading] = useState(false);
  const [replaceSlug, setReplaceSlug] = useState("");
  const [manualConfigOpen, setManualConfigOpen] = useState(false);
  const [practiceScreen, setPracticeScreen] = useState("menu");
  const [brandLogoMissing, setBrandLogoMissing] = useState(false);
  const [breathLogoMissing, setBreathLogoMissing] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [audioSrc, setAudioSrc] = useState("");
  const [audioStatus, setAudioStatus] = useState("idle");
  const [audioCheckStatus, setAudioCheckStatus] = useState("idle");
  const [audioCheckMessage, setAudioCheckMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [ambientAudioMap, setAmbientAudioMap] = useState({
    bosque: "",
    oceano: ""
  });
  const [septasyncAudioMap, setSeptasyncAudioMap] = useState({
    balance: "",
    gamma: "",
    trance: ""
  });

  const [phase, setPhase] = useState("idle");
  const [subphase, setSubphase] = useState("inhale");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [breathsDone, setBreathsDone] = useState(0);
  const [currentBreathNumber, setCurrentBreathNumber] = useState(1);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAwaitingFinalClose, setIsAwaitingFinalClose] = useState(false);
  const [endHoldProgress, setEndHoldProgress] = useState(0);
  const [stopHoldProgress, setStopHoldProgress] = useState(0);
  const [finalHoldProgress, setFinalHoldProgress] = useState(0);
  const [previousApneaSeconds, setPreviousApneaSeconds] = useState(0);

  const [progress, setProgress] = useState({
    totalSessions: 0,
    totalBreaths: 0,
    streak: 0,
    lastSessionDate: "",
    lastSummary: null,
    lastApneaSeconds: 0,
    apneaHistory: []
  });

  const submitColorVisionSession = useCallback(
    async (payload, flowStage = "practice") => {
      if (!slug || !token) return;
      const hits = Number(payload?.hits || 0);
      const misses = Number(payload?.misses || 0);
      const total = Math.max(0, hits + misses);
      const accuracy = total > 0 ? clampPercent((hits / total) * 100) : 0;
      try {
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            token,
            session: {
              sessionType: "colorVision",
              flowStage,
              completedAt: new Date().toISOString(),
              colorVision: {
                hits,
                misses,
                total,
                accuracy,
                colorsCalibrated: Number(payload?.colorsCalibrated || 0)
              }
            }
          })
        });
      } catch (_error) {
        // no-op
      }
    },
    [slug, token]
  );

  const audioRef = useRef(null);
  const breathAudioRef = useRef(null);
  const bosqueAudioRef = useRef(null);
  const endApneaAudioRef = useRef(null);
  const septasyncAudioRef = useRef(null);
  const preApneaCueAudioRef = useRef(null);
  const finalApneaCueAudioRef = useRef(null);
  const replaceInputRef = useRef(null);
  const intervalRef = useRef(null);
  const breathStopTimerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const pauseStartedAtRef = useRef(0);
  const endHoldTimeoutRef = useRef(null);
  const endHoldIntervalRef = useRef(null);
  const stopHoldTimeoutRef = useRef(null);
  const stopHoldIntervalRef = useRef(null);
  const finalHoldTimeoutRef = useRef(null);
  const finalHoldIntervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const sessionStartRef = useRef(null);
  const lastTapRef = useRef(0);
  const lastDoubleTapActionRef = useRef(0);
  const lastApneaMsRef = useRef(0);
  const roundApneaByCycleRef = useRef([]);
  const handlePhaseAdvanceRef = useRef(() => {});
  const countdownAbortRef = useRef(false);
  const phaseDeadlineRef = useRef(0);
  const apneaStartedAtRef = useRef(0);
  const startRequestRef = useRef(0);
  const phaseTransitionLockRef = useRef(false);

  const syncLoopTrackSource = (audioEl, url) => {
    if (!audioEl || !url) return false;
    const last = audioEl.dataset.trackSrc || "";
    if (last === url) return false;
    audioEl.src = url;
    audioEl.dataset.trackSrc = url;
    return true;
  };
  const preApneaCueCycleRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceNodeRef = useRef(null);
  const masterGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const convolverRef = useRef(null);
  const impulseSoftRef = useRef(null);
  const impulseCameraRef = useRef(null);
  const bosqueSourceNodeRef = useRef(null);
  const bosqueGainRef = useRef(null);
  const septasyncSourceNodeRef = useRef(null);
  const septasyncGainRef = useRef(null);
  const preCueSourceNodeRef = useRef(null);
  const preCueGainRef = useRef(null);
  const finalCueSourceNodeRef = useRef(null);
  const finalCueGainRef = useRef(null);
  const bosqueFadeStopRef = useRef(null);
  const septasyncFadeStopRef = useRef(null);

  const getEffectiveReverbMix = useCallback((cfg) => {
    if (cfg.reverbMode === "off") return 0;
    if (cfg.reverbMode === "camera") return Math.min(1, Math.max(0.35, Number(cfg.reverbMix || 0)));
    return Math.min(1, Math.max(0, Number(cfg.reverbMix || 0)));
  }, []);

  const updateReverbMix = useCallback((mixValue) => {
    const mix = Math.min(1, Math.max(0, Number(mixValue || 0)));
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - mix;
    if (wetGainRef.current) wetGainRef.current.gain.value = mix;
  }, []);

  const ensureReverbGraph = useCallback(() => {
    if (!audioRef.current) return false;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;

      if (!audioSourceNodeRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        const master = ctx.createGain();
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const convolver = ctx.createConvolver();
        convolver.buffer = buildImpulseResponse(ctx);

        source.connect(dryGain);
        source.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(master);
        wetGain.connect(master);
        master.connect(ctx.destination);

        audioSourceNodeRef.current = source;
        masterGainRef.current = master;
        dryGainRef.current = dryGain;
        wetGainRef.current = wetGain;
        convolverRef.current = convolver;
      }

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      audioRef.current.volume = 1;
      if (!impulseSoftRef.current) {
        impulseSoftRef.current = buildImpulseResponse(ctx, 1.4, 2.2);
      }
      if (!impulseCameraRef.current) {
        impulseCameraRef.current = buildImpulseResponse(ctx, 2.2, 2.8);
      }
      convolverRef.current.buffer =
        config.reverbMode === "camera" ? impulseCameraRef.current : impulseSoftRef.current;
      updateReverbMix(getEffectiveReverbMix(config));
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = Math.min(1, Math.max(0, config.audioVolume));
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [config.audioVolume, config.reverbMix, config.reverbMode, getEffectiveReverbMix, updateReverbMix]);

  const ensureAuxGainGraph = useCallback((audioElement, sourceRef, gainRef, baseGain = 1) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioElement || !Ctx) return false;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      const ctx = audioContextRef.current;
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioElement);
      }
      if (!gainRef.current) {
        gainRef.current = ctx.createGain();
        sourceRef.current.connect(gainRef.current);
        gainRef.current.connect(ctx.destination);
      }
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      audioElement.volume = 1;
      gainRef.current.gain.value = Math.max(0, Number(baseGain) || 0);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const smoothGainTo = useCallback((gainNode, target, seconds = 0.3) => {
    if (!gainNode) return;
    const now = gainNode.context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(0, Number(target) || 0), now + Math.max(0.01, seconds));
  }, []);

  useEffect(() => {
    const safeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", safeTheme);
    localStorage.setItem("rmcortex_theme", safeTheme);
  }, [theme]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    phaseTransitionLockRef.current = false;
  }, [phase, subphase, breathsDone, cycleIndex, isRunning, isPaused]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await fetchJsonWithTimeout("/api/students", 1800);
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (error) {
        try {
          const data = await fetchJsonWithTimeout("/students.json", 1800);
          setStudents(Array.isArray(data.students) ? data.students : []);
        } catch (innerError) {
          setLoadError("No se pudo cargar la lista de estudiantes.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (!event?.data || typeof event.data !== "object") return;
      const eventType = String(event.data?.type || "");
      if (eventType === "COLOR_SESSION_REPORT") {
        submitColorVisionSession(event.data?.payload || {}, "practice");
        return;
      }
      if (eventType === "COLOR_FLOW_EVENT") {
        const stage = String(event.data?.stage || "").toLowerCase();
        if (stage === "onboarding" || stage === "pre-practice" || stage === "prepractice") {
          const normalized = stage === "onboarding" ? "onboarding" : "prepractice";
          submitColorVisionSession(event.data?.payload || {}, normalized);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [submitColorVisionSession]);

  const studentsWithSlugs = useMemo(() => withGeneratedSlugs(students), [students]);

  const student = useMemo(() => {
    if (!slug) return null;
    return studentsWithSlugs.find((item) => item.slug === slug) || null;
  }, [slug, studentsWithSlugs]);

  const practiceOptions = useMemo(
    () =>
      PRACTICE_OPTIONS.map((item) => {
        if (item.id === "colores") {
          return {
            ...item,
            enabled: hasColorPracticeAccess(student)
          };
        }
        return item;
      }),
    [student]
  );

  const selectedAmbientUrl = useMemo(() => {
    if (config.ambientSound === "none") return "";
    return ambientAudioMap[config.ambientSound] || "";
  }, [ambientAudioMap, config.ambientSound]);

  const selectedSeptasyncUrl = useMemo(() => {
    if (config.septasyncTrack === "none") return "";
    if (config.septasyncTrack === "balance") return septasyncAudioMap.balance || "";
    if (config.septasyncTrack === "gamma") return septasyncAudioMap.gamma || "";
    if (config.septasyncTrack === "trance") return septasyncAudioMap.trance || "";
    return "";
  }, [config.septasyncTrack, septasyncAudioMap]);

  const filteredAdminStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return adminStudents;
    return adminStudents.filter((item) => (
      String(item.name || "").toLowerCase().includes(term) ||
      String(item.slug || "").toLowerCase().includes(term) ||
      String(item.audioKey || "").toLowerCase().includes(term)
    ));
  }, [adminStudents, searchTerm]);

  const adminAnalytics = useMemo(() => {
    const now = Date.now();
    const rows = adminStudents.map((item) => {
      const usage = item.usage || {};
      const sessionsByDay = usage.sessionsByDay || {};
      const lastSessionAt = usage.lastSessionAt || "";
      const lastMs = lastSessionAt ? Date.parse(lastSessionAt) : 0;
      const inactiveHours = lastMs ? (now - lastMs) / MS_PER_HOUR : Number.POSITIVE_INFINITY;
      const isActive = Number.isFinite(inactiveHours) && inactiveHours < ALERT_WARNING_HOURS;
      const alertLevel = !Number.isFinite(inactiveHours)
        ? "warning"
        : inactiveHours >= ALERT_CRITICAL_HOURS
          ? "critical"
          : inactiveHours >= ALERT_WARNING_HOURS
            ? "warning"
            : "ok";
      const today = toIsoDate(new Date().toISOString());
      const todaySessions = Number(sessionsByDay[today] || 0);
      const roundSums = normalizeRoundArray(usage.apneaRoundSums, 5);
      const roundCounts = normalizeRoundArray(usage.apneaRoundCounts, 5);
      const flowStats = usage.flowStats || {};
      const colorVisionUsage = usage.colorVisionUsage || {};
      const roundAvg = roundSums.map((sum, idx) => {
        const count = roundCounts[idx] || 0;
        return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      });
      const flowState = {
        onboarding: Number(flowStats.onboarding || 0) > 0,
        prePractice: Number(flowStats.prePractice || 0) > 0,
        practice: Number(flowStats.practice || 0) > 0
      };
      return {
        ...item,
        usage,
        isActive,
        alertLevel,
        inactiveHours,
        todaySessions,
        totalSessions: Number(usage.totalSessions || 0),
        totalRounds: Number(usage.totalRounds || 0),
        onboardingSessions: Number(flowStats.onboarding || 0),
        prePracticeSessions: Number(flowStats.prePractice || 0),
        practiceSessions: Number(flowStats.practice || 0),
        colorVisionSessions: Number(colorVisionUsage.totalSessions || 0),
        colorVisionAccuracy: Number(colorVisionUsage.averageAccuracy || 0),
        flowState,
        roundAvg,
        lastSessionAt
      };
    });

    const active = rows.filter((item) => item.isActive);
    const warning = rows.filter((item) => item.alertLevel === "warning");
    const critical = rows.filter((item) => item.alertLevel === "critical");
    const moreThanOnceToday = rows.filter((item) => item.todaySessions > 1);
    const abandoned = rows.filter((item) => item.alertLevel === "critical");
    const practicingDaily = rows.filter((item) => item.todaySessions >= 1);

    return {
      rows,
      active,
      warning,
      critical,
      moreThanOnceToday,
      abandoned,
      practicingDaily,
      hasAttention: critical.length > 0 || warning.length > 0
    };
  }, [adminStudents]);

  useEffect(() => {
    if (!slug) return;
    const savedConfig = localStorage.getItem(`rmcortex_config_${slug}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          ambientSound: parsed.ambientSound || prev.ambientSound,
          septasyncTrack: parsed.septasyncTrack || prev.septasyncTrack,
          septasyncVolume: Number.isFinite(parsed.septasyncVolume)
            ? parsed.septasyncVolume
            : prev.septasyncVolume,
          bosqueVolume: Number.isFinite(parsed.bosqueVolume)
            ? parsed.bosqueVolume
            : prev.bosqueVolume
        }));
      } catch (error) {
        // ignore malformed
      }
    }
    const saved = localStorage.getItem(`rmcortex_progress_${slug}`);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (error) {
        // ignore malformed
      }
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(`rmcortex_config_${slug}`, JSON.stringify(config));
  }, [config, slug]);

  useEffect(() => {
    if (!audioRef.current) return;
    const hasGraph = Boolean(audioSourceNodeRef.current);
    if (hasGraph && masterGainRef.current) {
      audioRef.current.volume = 1;
      masterGainRef.current.gain.value = Math.min(1, Math.max(0, config.audioVolume));
      return;
    }
    audioRef.current.volume = Math.min(1, Math.max(0, config.audioVolume));
  }, [config.audioVolume]);

  useEffect(() => {
    if (convolverRef.current && impulseSoftRef.current && impulseCameraRef.current) {
      convolverRef.current.buffer =
        config.reverbMode === "camera" ? impulseCameraRef.current : impulseSoftRef.current;
    }
    updateReverbMix(getEffectiveReverbMix(config));
  }, [config.reverbMix, config.reverbMode, config, getEffectiveReverbMix, updateReverbMix]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, Math.min(1, Math.max(0, config.bosqueVolume)), 0.2);
    } else {
      bosqueAudioRef.current.volume = Math.min(1, Math.max(0, config.bosqueVolume));
    }
  }, [config.bosqueVolume, smoothGainTo]);

  useEffect(() => {
    setAudioSrc("");
    setAudioStatus("idle");
  }, [student?.slug]);

  const fetchAudioUrl = useCallback(async (audioSlug, providedToken) => {
    const tokenPart = providedToken
      ? `&token=${encodeURIComponent(providedToken)}`
      : "";
    const response = await fetch(
      `/api/audio?slug=${encodeURIComponent(audioSlug)}${tokenPart}`
    );
    if (!response.ok) return "";
    const data = await response.json();
    return data?.url || "";
  }, []);

  const loadSystemAudio = useCallback(async () => {
    const nextAmbient = {};
    const nextSeptasync = {};
    const entries = Object.entries(SYSTEM_AUDIO);
    for (const [key, value] of entries) {
      try {
        const url = await fetchAudioUrl(value.slug, value.token);
        if (!url) continue;
        if (key === "respirax1" && breathAudioRef.current) {
          breathAudioRef.current.src = url;
        }
        if (key === "bosque7") {
          nextAmbient.bosque = url;
          if (config.ambientSound === "bosque" && bosqueAudioRef.current) {
            bosqueAudioRef.current.src = url;
          }
        }
        if (key === "oceano") {
          nextAmbient.oceano = url;
          if (config.ambientSound === "oceano" && bosqueAudioRef.current) {
            bosqueAudioRef.current.src = url;
          }
        }
        if (key === "inalamos" && endApneaAudioRef.current) {
          endApneaAudioRef.current.src = url;
        }
        if (key === "septasyncBalance") {
          nextSeptasync.balance = url;
          if (config.septasyncTrack === "balance" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
        if (key === "septasyncGamma") {
          nextSeptasync.gamma = url;
          if (config.septasyncTrack === "gamma" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
        if (key === "septasyncTrance") {
          nextSeptasync.trance = url;
          if (config.septasyncTrack === "trance" && septasyncAudioRef.current) {
            septasyncAudioRef.current.src = url;
          }
        }
      } catch (error) {
        // ignore
      }
    }
    if (Object.keys(nextAmbient).length) {
      setAmbientAudioMap((prev) => ({ ...prev, ...nextAmbient }));
    }
    if (Object.keys(nextSeptasync).length) {
      setSeptasyncAudioMap((prev) => ({ ...prev, ...nextSeptasync }));
    }
    return { nextAmbient, nextSeptasync };
  }, [config.ambientSound, config.septasyncTrack, fetchAudioUrl]);

  useEffect(() => {
    loadSystemAudio();
  }, [loadSystemAudio]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    if (!selectedAmbientUrl) {
      const keepSessionLoop =
        (isRunningRef.current || (phaseRef.current === "complete" && isAwaitingFinalClose)) &&
        Boolean(bosqueAudioRef.current.dataset.trackSrc);
      if (keepSessionLoop) return;
      stopBosque();
      return;
    }
    syncLoopTrackSource(bosqueAudioRef.current, selectedAmbientUrl);
  }, [selectedAmbientUrl, isAwaitingFinalClose]);

  useEffect(() => {
    const shouldKeepPlaying = isRunning || (phase === "complete" && isAwaitingFinalClose);
    if (!shouldKeepPlaying || isPaused) {
      stopBosque();
      return;
    }
    playBosque();
  }, [phase, isRunning, isPaused, selectedAmbientUrl, isAwaitingFinalClose]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) {
      const keepSessionLoop =
        (isRunningRef.current || (phaseRef.current === "complete" && isAwaitingFinalClose)) &&
        Boolean(septasyncAudioRef.current.dataset.trackSrc);
      if (keepSessionLoop) return;
      stopSeptasync();
      return;
    }
    syncLoopTrackSource(septasyncAudioRef.current, selectedSeptasyncUrl);
  }, [selectedSeptasyncUrl, isAwaitingFinalClose]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, Math.min(1, Math.max(0, config.septasyncVolume)), 0.2);
    } else {
      septasyncAudioRef.current.volume = Math.min(1, Math.max(0, config.septasyncVolume));
    }
  }, [config.septasyncVolume, smoothGainTo]);

  useEffect(() => {
    const shouldKeepPlaying = isRunning || (phase === "complete" && isAwaitingFinalClose);
    if (!shouldKeepPlaying || isPaused) {
      stopSeptasync();
      return;
    }
    playSeptasync();
  }, [isRunning, isPaused, selectedSeptasyncUrl, phase, isAwaitingFinalClose]);

  useEffect(() => {
    if (!isRunning || isPaused || phase === "idle") return;
    const watchdog = setInterval(() => {
      if (!isRunningRef.current || isPausedRef.current) return;
      if (selectedAmbientUrl && bosqueAudioRef.current?.paused) {
        playBosque();
      }
      if (selectedSeptasyncUrl && septasyncAudioRef.current?.paused) {
        playSeptasync();
      }
      if (phaseRef.current === "breathing" && breathAudioRef.current?.paused) {
        playBreathSound();
      }
    }, 600);
    return () => clearInterval(watchdog);
  }, [isRunning, isPaused, phase, selectedAmbientUrl, selectedSeptasyncUrl]);

  useEffect(() => {
    if (!isRunning || isPaused || phase === "complete") return;

    intervalRef.current = setInterval(() => {
      if (phaseRef.current === "apnea") {
        const elapsed = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
        setTimeLeftMs(elapsed);
        return;
      }

      const remaining = Math.max(0, (phaseDeadlineRef.current || 0) - Date.now());
      if (remaining > 0) {
        setTimeLeftMs(remaining);
        return;
      }

      setTimeLeftMs(0);
      if (phaseTransitionLockRef.current) return;
      phaseTransitionLockRef.current = true;
      handlePhaseAdvanceRef.current();
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, phase]);

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch (error) {
      // ignore unsupported/blocked
    }
  };

  const releaseWakeLock = async () => {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch (error) {
      // ignore
    } finally {
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (isRunning && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRunning, isPaused]);

  useEffect(() => {
    const onVisibility = () => {
      if (isRunningRef.current && !isPausedRef.current) {
        requestWakeLock();
        if (phaseRef.current === "apnea") {
          const elapsed = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
          setTimeLeftMs(elapsed);
        } else {
          const remaining = Math.max(0, (phaseDeadlineRef.current || 0) - Date.now());
          setTimeLeftMs(remaining);
        }
      }
      if (document.visibilityState === "visible" && audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      if (document.visibilityState === "visible" && isRunningRef.current && !isPausedRef.current) {
        const safePlay = (audioEl) => {
          if (!audioEl || !audioEl.src) return;
          audioEl.play().catch(() => {});
        };
        if (phaseRef.current === "apnea") {
          safePlay(audioRef.current);
        }
        if (phaseRef.current === "breathing") {
          safePlay(breathAudioRef.current);
        }
        safePlay(bosqueAudioRef.current);
        safePlay(septasyncAudioRef.current);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => () => {
    cancelEndApneaHold();
    cancelStopHold();
    cancelFinalizeHold();
    if (bosqueFadeStopRef.current) {
      clearTimeout(bosqueFadeStopRef.current);
      bosqueFadeStopRef.current = null;
    }
    if (septasyncFadeStopRef.current) {
      clearTimeout(septasyncFadeStopRef.current);
      septasyncFadeStopRef.current = null;
    }
    releaseWakeLock();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [smoothGainTo]);

  const handlePhaseAdvance = () => {
    if (phase === "breathing") {
      if (subphase === "inhale") {
        setSubphase("exhale");
        const exhaleMs = config.exhaleSeconds * 1000;
        phaseDeadlineRef.current = Date.now() + exhaleMs;
        setTimeLeftMs(exhaleMs);
        return;
      }

      const nextBreaths = breathsDone + 1;
      if (nextBreaths >= config.breathsPerCycle) {
        setBreathsDone(nextBreaths);
        startApnea();
        return;
      }

      const upcomingBreath = nextBreaths + 1;
      const cueBreath = Math.max(1, config.breathsPerCycle - PRE_APNEA_BREATHS_LEFT);
      if (upcomingBreath === cueBreath && preApneaCueCycleRef.current !== cycleIndex) {
        playPreApneaCue();
        preApneaCueCycleRef.current = cycleIndex;
      }

      setBreathsDone(nextBreaths);
      setSubphase("inhale");
      setCurrentBreathNumber(nextBreaths + 1);
      const inhaleMs = config.inhaleSeconds * 1000;
      phaseDeadlineRef.current = Date.now() + inhaleMs;
      setTimeLeftMs(inhaleMs);
      return;
    }

    if (phase === "apnea") {
      startRecovery();
      return;
    }

    if (phase === "recovery") {
      if (cycleIndex < config.cycles) {
        setCycleIndex((prev) => prev + 1);
        setBreathsDone(0);
        setSubphase("inhale");
        setCurrentBreathNumber(1);
        playBreathSound();
        setPhase("breathing");
        const inhaleMs = config.inhaleSeconds * 1000;
        phaseDeadlineRef.current = Date.now() + inhaleMs;
        setTimeLeftMs(inhaleMs);
        return;
      }

      finishSession();
    }
  };

  useEffect(() => {
    handlePhaseAdvanceRef.current = handlePhaseAdvance;
  }, [handlePhaseAdvance]);

  const waitForAudioReady = (audioElement, timeoutMs = 1200) =>
    new Promise((resolve) => {
      if (!audioElement || !audioElement.src) {
        resolve(false);
        return;
      }
      if (audioElement.readyState >= 2) {
        resolve(true);
        return;
      }
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        audioElement.removeEventListener("canplay", onReady);
        audioElement.removeEventListener("loadeddata", onReady);
        audioElement.removeEventListener("error", onError);
        clearTimeout(timer);
        resolve(result);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timer = setTimeout(() => finish(false), timeoutMs);
      audioElement.addEventListener("canplay", onReady);
      audioElement.addEventListener("loadeddata", onReady);
      audioElement.addEventListener("error", onError);
      audioElement.load();
    });

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const warmupAudioElement = async (audioElement, durationMs = 140) => {
    if (!audioElement || !audioElement.src) return false;
    const wasMuted = audioElement.muted;
    const wasLoop = audioElement.loop;
    try {
      audioElement.muted = true;
      audioElement.loop = false;
      audioElement.currentTime = 0;
      await audioElement.play();
      await sleep(durationMs);
      audioElement.pause();
      audioElement.currentTime = 0;
      return true;
    } catch (_error) {
      return false;
    } finally {
      audioElement.muted = wasMuted;
      audioElement.loop = wasLoop;
    }
  };

  const warmupAllAudios = async (effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }

    const targets = [
      audioRef.current,
      breathAudioRef.current,
      endApneaAudioRef.current,
      preApneaCueAudioRef.current,
      finalApneaCueAudioRef.current,
      effectiveAmbientUrl ? bosqueAudioRef.current : null,
      effectiveSeptasyncUrl ? septasyncAudioRef.current : null
    ].filter(Boolean);

    await Promise.all(targets.map((audioEl) => warmupAudioElement(audioEl)));
  };

  const primeAudioElementFromGesture = (audioElement) => {
    if (!audioElement || !audioElement.src) return;
    const wasMuted = audioElement.muted;
    const wasLoop = audioElement.loop;
    try {
      audioElement.muted = true;
      audioElement.loop = false;
      audioElement.currentTime = 0;
      const playResult = audioElement.play();
      if (playResult && typeof playResult.then === "function") {
        playResult
          .then(() => {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.muted = wasMuted;
            audioElement.loop = wasLoop;
          })
          .catch(() => {
            audioElement.muted = wasMuted;
            audioElement.loop = wasLoop;
          });
      } else {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.muted = wasMuted;
        audioElement.loop = wasLoop;
      }
    } catch (_error) {
      audioElement.muted = wasMuted;
      audioElement.loop = wasLoop;
    }
  };

  const primeAllSessionAudios = useCallback((effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }

    ensureReverbGraph();
    ensureAuxGainGraph(bosqueAudioRef.current, bosqueSourceNodeRef, bosqueGainRef, 0);
    ensureAuxGainGraph(septasyncAudioRef.current, septasyncSourceNodeRef, septasyncGainRef, 0);
    ensureAuxGainGraph(preApneaCueAudioRef.current, preCueSourceNodeRef, preCueGainRef, 1.8);
    ensureAuxGainGraph(finalApneaCueAudioRef.current, finalCueSourceNodeRef, finalCueGainRef, 1.8);

    const targets = [
      audioRef.current,
      breathAudioRef.current,
      endApneaAudioRef.current,
      preApneaCueAudioRef.current,
      finalApneaCueAudioRef.current,
      effectiveAmbientUrl ? bosqueAudioRef.current : null,
      effectiveSeptasyncUrl ? septasyncAudioRef.current : null
    ].filter(Boolean);

    targets.forEach((audioEl) => primeAudioElementFromGesture(audioEl));
  }, [ensureAuxGainGraph, ensureReverbGraph]);

  const beginSession = (effectiveAmbientUrl, effectiveSeptasyncUrl) => {
    phaseTransitionLockRef.current = false;
    sessionStartRef.current = Date.now();
    roundApneaByCycleRef.current = [];
    pauseStartedAtRef.current = 0;
    setIsRunning(true);
    setIsPaused(false);
    setIsAwaitingFinalClose(false);
    setPreviousApneaSeconds(0);
    preApneaCueCycleRef.current = null;
    setPhase("breathing");
    setCycleIndex(1);
    setBreathsDone(0);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    if (effectiveAmbientUrl) playBosque();
    if (effectiveSeptasyncUrl) playSeptasync();
    playBreathSound();
    const inhaleMs = config.inhaleSeconds * 1000;
    phaseDeadlineRef.current = Date.now() + inhaleMs;
    apneaStartedAtRef.current = 0;
    setTimeLeftMs(inhaleMs);
  };

  const runAudioCheck = async () => {
    setAudioCheckStatus("checking");
    setAudioCheckMessage("Chequeando audios...");
    const loaded = await loadSystemAudio();
    const effectiveAmbientUrl = getAmbientUrlFromMap(
      { ...ambientAudioMap, ...(loaded?.nextAmbient || {}) },
      config.ambientSound
    );
    const effectiveSeptasyncUrl = getSeptasyncUrlFromMap(
      { ...septasyncAudioMap, ...(loaded?.nextSeptasync || {}) },
      config.septasyncTrack
    );
    if (effectiveAmbientUrl && bosqueAudioRef.current) {
      syncLoopTrackSource(bosqueAudioRef.current, effectiveAmbientUrl);
    }
    if (effectiveSeptasyncUrl && septasyncAudioRef.current) {
      syncLoopTrackSource(septasyncAudioRef.current, effectiveSeptasyncUrl);
    }
    const apneaUrl = await loadSignedAudio();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.muted = true;
    }
    const checks = [];
    if (apneaUrl && audioRef.current) checks.push(waitForAudioReady(audioRef.current));
    if (breathAudioRef.current?.src) checks.push(waitForAudioReady(breathAudioRef.current));
    if (endApneaAudioRef.current?.src) checks.push(waitForAudioReady(endApneaAudioRef.current));
    if (preApneaCueAudioRef.current?.src) checks.push(waitForAudioReady(preApneaCueAudioRef.current));
    if (finalApneaCueAudioRef.current?.src) checks.push(waitForAudioReady(finalApneaCueAudioRef.current));
    if (effectiveAmbientUrl && bosqueAudioRef.current?.src) checks.push(waitForAudioReady(bosqueAudioRef.current));
    if (effectiveSeptasyncUrl && septasyncAudioRef.current?.src) checks.push(waitForAudioReady(septasyncAudioRef.current));

    const results = await Promise.all(checks);
    const okCount = results.filter(Boolean).length;
    const allOk = results.length > 0 && okCount === results.length;

    if (allOk || (apneaUrl && okCount >= 1)) {
      setAudioCheckStatus("ready");
      setAudioCheckMessage(`Audio OK (${okCount}/${results.length})`);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.loop = false;
        audioRef.current.muted = false;
      }
      return true;
    }

    setAudioCheckStatus("warning");
    setAudioCheckMessage(`Audio parcial (${okCount}/${results.length}), inicio permitido`);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.muted = false;
    }
    return true;
  };

  const startSession = async () => {
    if (!student || isRunningRef.current || isStarting) return;
    setIsStarting(true);
    await requestWakeLock();
    const startNonce = Date.now();
    startRequestRef.current = startNonce;
    try {
      const immediateAmbientUrl = getAmbientUrlFromMap(ambientAudioMap, config.ambientSound);
      const immediateSeptasyncUrl = getSeptasyncUrlFromMap(septasyncAudioMap, config.septasyncTrack);
      primeAllSessionAudios(immediateAmbientUrl, immediateSeptasyncUrl);

      setAudioCheckStatus("checking");
      setAudioCheckMessage("Preparando audios...");

      const loaded = await loadSystemAudio();
      if (startRequestRef.current !== startNonce) return;

      const effectiveAmbientUrl = getAmbientUrlFromMap(
        { ...ambientAudioMap, ...(loaded?.nextAmbient || {}) },
        config.ambientSound
      );
      const effectiveSeptasyncUrl = getSeptasyncUrlFromMap(
        { ...septasyncAudioMap, ...(loaded?.nextSeptasync || {}) },
        config.septasyncTrack
      );

      const apneaUrl = await loadSignedAudio();
      if (startRequestRef.current !== startNonce) return;

      await warmupAllAudios(effectiveAmbientUrl, effectiveSeptasyncUrl);
      if (startRequestRef.current !== startNonce) return;

      if (apneaUrl) {
        setAudioCheckStatus("ready");
        setAudioCheckMessage("Audio OK");
      } else {
        setAudioCheckStatus("warning");
        setAudioCheckMessage("Audio estudiante no disponible, iniciando igual");
      }

      beginSession(effectiveAmbientUrl, effectiveSeptasyncUrl);
    } catch (_error) {
      setAudioCheckStatus("warning");
      setAudioCheckMessage("No se pudo preparar todo el audio. Reintenta.");
    } finally {
      setIsStarting(false);
    }
  };

  const pauseSession = () => {
    pauseStartedAtRef.current = Date.now();
    setIsPaused(true);
    pauseAudio();
    stopBreathSound();
  };

  const resumeSession = () => {
    const pausedMs = pauseStartedAtRef.current ? Math.max(0, Date.now() - pauseStartedAtRef.current) : 0;
    pauseStartedAtRef.current = 0;
    if (pausedMs > 0) {
      if (phaseRef.current === "apnea") {
        apneaStartedAtRef.current += pausedMs;
      } else if (phaseDeadlineRef.current) {
        phaseDeadlineRef.current += pausedMs;
      }
    }
    setIsPaused(false);
    if (phase === "apnea") playAudio();
    if (phase === "breathing") {
      playBosque();
      playBreathSound();
    }
  };

  const stopSession = () => {
    countdownAbortRef.current = true;
    setStartCountdown(0);
    cancelStopHold();
    cancelFinalizeHold();
    cancelEndApneaHold();
    setIsRunning(false);
    setIsPaused(false);
    setIsAwaitingFinalClose(false);
    pauseStartedAtRef.current = 0;
    phaseDeadlineRef.current = 0;
    apneaStartedAtRef.current = 0;
    phaseTransitionLockRef.current = false;
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    roundApneaByCycleRef.current = [];
    stopAudio();
    stopBosque();
    stopSeptasync();
    stopBreathSound();
    if (preApneaCueAudioRef.current) {
      preApneaCueAudioRef.current.pause();
      preApneaCueAudioRef.current.currentTime = 0;
    }
    if (finalApneaCueAudioRef.current) {
      finalApneaCueAudioRef.current.pause();
      finalApneaCueAudioRef.current.currentTime = 0;
    }
  };

  const startApnea = () => {
    setPhase("apnea");
    apneaStartedAtRef.current = Date.now();
    phaseDeadlineRef.current = 0;
    setTimeLeftMs(0);
    stopBreathSound();
    const startPlayback = () => {
      playAudio();
      setTimeout(() => {
        if (!isRunningRef.current || isPausedRef.current) return;
        if (selectedAmbientUrl) playBosque();
        if (selectedSeptasyncUrl) playSeptasync();
      }, 250);
    };

    if (audioRef.current?.src || audioSrc) {
      startPlayback();
      return;
    }

    loadSignedAudio().then((url) => {
      if (url) startPlayback();
    });
  };

  const startRecovery = () => {
    if (phase === "apnea") {
      const apneaMs = Math.max(0, Date.now() - (apneaStartedAtRef.current || Date.now()));
      const apneaSeconds = Math.round(apneaMs / 1000);
      lastApneaMsRef.current = apneaMs;
      setPreviousApneaSeconds(apneaSeconds);
      roundApneaByCycleRef.current[cycleIndex - 1] = apneaSeconds;
      stopAudio();
      if (cycleIndex < config.cycles) {
        playEndApnea();
      }
      if (cycleIndex >= config.cycles) {
        playFinalApneaCue();
      }
    }
    setPhase("recovery");
    const recoveryMs = config.recoverySeconds * 1000;
    phaseDeadlineRef.current = Date.now() + recoveryMs;
    setTimeLeftMs(recoveryMs);
  };

  const recordSessionMetrics = async ({ completedRounds, plannedRounds, breathsPerCycle, apneaByRound }) => {
    if (!student?.slug || !token) return;
    try {
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: student.slug,
          token,
          session: {
            completedRounds,
            plannedRounds,
            breathsPerCycle,
            apneaByRound,
            completedAt: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.warn("session metrics warning:", error?.message || error);
    }
  };

  const finishSession = () => {
    setPhase("complete");
    setIsRunning(true);
    setIsPaused(false);
    setIsAwaitingFinalClose(true);
    pauseStartedAtRef.current = 0;
    phaseDeadlineRef.current = 0;
    apneaStartedAtRef.current = 0;
    phaseTransitionLockRef.current = false;
    setTimeLeftMs(0);
    stopAudio();
    stopBreathSound();

    const today = getTodayKey();
    const yesterday = getYesterdayKey();
    const addedBreaths = config.breathsPerCycle * config.cycles;
    const apneaByRound = roundApneaByCycleRef.current
      .slice(0, config.cycles)
      .map((value) => Math.max(0, Number(value || 0)));

    recordSessionMetrics({
      completedRounds: cycleIndex,
      plannedRounds: config.cycles,
      breathsPerCycle: config.breathsPerCycle,
      apneaByRound
    });

    setProgress((prev) => {
      const lastDate = prev.lastSessionDate || "";
      let nextStreak = prev.streak || 0;

      if (lastDate === today) {
        nextStreak = prev.streak;
      } else if (lastDate === yesterday) {
        nextStreak = (prev.streak || 0) + 1;
      } else {
        nextStreak = 1;
      }

      const updated = {
        totalSessions: (prev.totalSessions || 0) + 1,
        totalBreaths: (prev.totalBreaths || 0) + addedBreaths,
        streak: nextStreak,
        lastSessionDate: today,
        lastApneaSeconds: Math.round((lastApneaMsRef.current || 0) / 1000),
        apneaHistory: [
          ...(prev.apneaHistory || []),
          {
            date: today,
            seconds: Math.round((lastApneaMsRef.current || 0) / 1000),
            timestamp: new Date().toISOString()
          }
        ].slice(-10),
        lastSummary: {
          date: today,
          cycles: config.cycles,
          breaths: addedBreaths,
          apneaSeconds: Math.round((lastApneaMsRef.current || 0) / 1000)
        }
      };

      localStorage.setItem(`rmcortex_progress_${slug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const playAudio = () => {
    if (!audioRef.current) return;
    ensureReverbGraph();
    audioRef.current.muted = false;
    audioRef.current.currentTime = 0;
    audioRef.current.loop = true;
    audioRef.current.play().catch(() => {
      // Autoplay might be blocked until user gesture
    });
  };

  const playBreathSound = () => {
    if (!breathAudioRef.current) return;
    if (breathStopTimerRef.current) {
      clearTimeout(breathStopTimerRef.current);
      breathStopTimerRef.current = null;
    }
    if (!breathAudioRef.current.paused) return;
    breathAudioRef.current.currentTime = 0;
    breathAudioRef.current.loop = true;
    breathAudioRef.current.play().catch(() => {});
  };

  const stopBreathSound = () => {
    if (!breathAudioRef.current) return;
    if (breathStopTimerRef.current) {
      clearTimeout(breathStopTimerRef.current);
      breathStopTimerRef.current = null;
    }
    breathAudioRef.current.pause();
    breathAudioRef.current.currentTime = 0;
  };

  const playBosque = () => {
    if (!bosqueAudioRef.current) return;
    if (!selectedAmbientUrl) return;
    const changedSource = syncLoopTrackSource(bosqueAudioRef.current, selectedAmbientUrl);
    if (bosqueFadeStopRef.current) {
      clearTimeout(bosqueFadeStopRef.current);
      bosqueFadeStopRef.current = null;
    }
    const targetGain = Math.min(1, Math.max(0, config.bosqueVolume));
    ensureAuxGainGraph(
      bosqueAudioRef.current,
      bosqueSourceNodeRef,
      bosqueGainRef,
      0
    );
    bosqueAudioRef.current.loop = true;
    if (bosqueAudioRef.current.paused || changedSource) {
      bosqueAudioRef.current.play().then(() => {
        if (bosqueGainRef.current) {
          smoothGainTo(bosqueGainRef.current, targetGain, 0.35);
        }
      }).catch(() => {});
      return;
    }
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, targetGain, 0.35);
    }
  };

  const stopBosque = () => {
    if (!bosqueAudioRef.current) return;
    if (bosqueGainRef.current) {
      smoothGainTo(bosqueGainRef.current, 0, 0.35);
      if (bosqueFadeStopRef.current) {
        clearTimeout(bosqueFadeStopRef.current);
      }
      bosqueFadeStopRef.current = setTimeout(() => {
        if (!bosqueAudioRef.current) return;
        bosqueAudioRef.current.pause();
        bosqueAudioRef.current.currentTime = 0;
        bosqueFadeStopRef.current = null;
      }, 380);
      return;
    }
    bosqueAudioRef.current.pause();
    bosqueAudioRef.current.currentTime = 0;
  };

  const playSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) return;
    const changedSource = syncLoopTrackSource(septasyncAudioRef.current, selectedSeptasyncUrl);
    if (septasyncFadeStopRef.current) {
      clearTimeout(septasyncFadeStopRef.current);
      septasyncFadeStopRef.current = null;
    }
    const targetGain = Math.min(1, Math.max(0, config.septasyncVolume));
    ensureAuxGainGraph(
      septasyncAudioRef.current,
      septasyncSourceNodeRef,
      septasyncGainRef,
      0
    );
    septasyncAudioRef.current.loop = true;
    if (septasyncAudioRef.current.paused || changedSource) {
      septasyncAudioRef.current.play().then(() => {
        if (septasyncGainRef.current) {
          smoothGainTo(septasyncGainRef.current, targetGain, 0.35);
        }
      }).catch(() => {});
      return;
    }
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, targetGain, 0.35);
    }
  };

  const stopSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    if (septasyncGainRef.current) {
      smoothGainTo(septasyncGainRef.current, 0, 0.35);
      if (septasyncFadeStopRef.current) {
        clearTimeout(septasyncFadeStopRef.current);
      }
      septasyncFadeStopRef.current = setTimeout(() => {
        if (!septasyncAudioRef.current) return;
        septasyncAudioRef.current.pause();
        septasyncAudioRef.current.currentTime = 0;
        septasyncFadeStopRef.current = null;
      }, 380);
      return;
    }
    septasyncAudioRef.current.pause();
    septasyncAudioRef.current.currentTime = 0;
  };

  const reviveAmbientIfNeeded = () => {
    if (!isRunningRef.current || isPausedRef.current) return;
    if (!selectedAmbientUrl) return;
    if (bosqueAudioRef.current?.paused) {
      playBosque();
    }
  };

  const reviveSeptasyncIfNeeded = () => {
    if (!isRunningRef.current || isPausedRef.current) return;
    if (!selectedSeptasyncUrl) return;
    if (septasyncAudioRef.current?.paused) {
      playSeptasync();
    }
  };

  const playEndApnea = () => {
    if (!endApneaAudioRef.current) return;
    endApneaAudioRef.current.currentTime = 0;
    endApneaAudioRef.current.loop = false;
    endApneaAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(endApneaAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const playPreApneaCue = () => {
    if (!preApneaCueAudioRef.current) return;
    ensureAuxGainGraph(preApneaCueAudioRef.current, preCueSourceNodeRef, preCueGainRef, 1.8);
    preApneaCueAudioRef.current.currentTime = 0;
    preApneaCueAudioRef.current.loop = false;
    preApneaCueAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(preApneaCueAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const playFinalApneaCue = () => {
    if (!finalApneaCueAudioRef.current) return;
    ensureAuxGainGraph(finalApneaCueAudioRef.current, finalCueSourceNodeRef, finalCueGainRef, 1.8);
    finalApneaCueAudioRef.current.currentTime = 0;
    finalApneaCueAudioRef.current.loop = false;
    finalApneaCueAudioRef.current.play().catch(() => {
      try {
        const fallback = new Audio(finalApneaCueAudioRef.current.src);
        fallback.play().catch(() => {});
      } catch (_error) {
        // ignore
      }
    });
  };

  const loadSignedAudio = async () => {
    if (!student?.slug) return null;
    setAudioStatus("loading");
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
      const response = await fetch(
        `/api/audio?slug=${encodeURIComponent(student.slug)}${tokenParam}`
      );
      if (!response.ok) throw new Error("No se pudo firmar el audio");
      const data = await response.json();
      if (!data?.url) throw new Error("URL inválida");
      setAudioSrc(data.url);
      setAudioStatus("ready");
      if (audioRef.current) {
        audioRef.current.src = data.url;
      }
      return data.url;
    } catch (error) {
      setAudioStatus("error");
      return null;
    }
  };

  const previewAudio = () => {
    loadSignedAudio().then((url) => {
      if (!url || !audioRef.current) return;
      ensureReverbGraph();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      audioRef.current.play().catch(() => {
        // Autoplay might be blocked until user gesture
      });
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    const audioEl = audioRef.current;
    audioEl.loop = false;
    audioEl.muted = true;
    audioEl.pause();
    try {
      audioEl.currentTime = 0;
    } catch (_error) {
      // iOS puede bloquear currentTime durante cambios de foco.
    }

    if (masterGainRef.current) {
      const now = audioContextRef.current?.currentTime || 0;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(Math.min(1, Math.max(0, config.audioVolume)), now);
    }

    setTimeout(() => {
      if (!audioRef.current) return;
      audioRef.current.muted = false;
    }, 60);
  };

  const cancelEndApneaHold = () => {
    if (endHoldTimeoutRef.current) {
      clearTimeout(endHoldTimeoutRef.current);
      endHoldTimeoutRef.current = null;
    }
    if (endHoldIntervalRef.current) {
      clearInterval(endHoldIntervalRef.current);
      endHoldIntervalRef.current = null;
    }
    setEndHoldProgress(0);
  };

  const startEndApneaHold = (event) => {
    if (phase !== "apnea") return;
    event.preventDefault();
    cancelEndApneaHold();
    const startAt = Date.now();
    const holdMs = 1500;
    endHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / holdMs) * 100);
      setEndHoldProgress(pct);
    }, 30);
    endHoldTimeoutRef.current = setTimeout(() => {
      cancelEndApneaHold();
      endApneaEarly();
    }, holdMs);
  };

  const endApneaEarly = () => {
    if (phase !== "apnea") return;
    startRecovery();
  };

  const cancelStopHold = () => {
    if (stopHoldTimeoutRef.current) {
      clearTimeout(stopHoldTimeoutRef.current);
      stopHoldTimeoutRef.current = null;
    }
    if (stopHoldIntervalRef.current) {
      clearInterval(stopHoldIntervalRef.current);
      stopHoldIntervalRef.current = null;
    }
    setStopHoldProgress(0);
  };

  const startStopHold = (event) => {
    if (!isRunning || phase === "apnea" || phase === "complete") return;
    event.preventDefault();
    cancelStopHold();
    const startAt = Date.now();
    stopHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / STOP_HOLD_MS) * 100);
      setStopHoldProgress(pct);
    }, 30);
    stopHoldTimeoutRef.current = setTimeout(() => {
      cancelStopHold();
      stopSession();
    }, STOP_HOLD_MS);
  };

  const cancelFinalizeHold = () => {
    if (finalHoldTimeoutRef.current) {
      clearTimeout(finalHoldTimeoutRef.current);
      finalHoldTimeoutRef.current = null;
    }
    if (finalHoldIntervalRef.current) {
      clearInterval(finalHoldIntervalRef.current);
      finalHoldIntervalRef.current = null;
    }
    setFinalHoldProgress(0);
  };

  const finalizeCompleteSession = () => {
    cancelFinalizeHold();
    cancelEndApneaHold();
    cancelStopHold();
    setIsAwaitingFinalClose(false);
    setIsRunning(false);
    setIsPaused(false);
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    stopAudio();
    stopBreathSound();
    stopBosque();
    stopSeptasync();
    if (preApneaCueAudioRef.current) {
      preApneaCueAudioRef.current.pause();
      preApneaCueAudioRef.current.currentTime = 0;
    }
    if (finalApneaCueAudioRef.current) {
      finalApneaCueAudioRef.current.pause();
      finalApneaCueAudioRef.current.currentTime = 0;
    }
  };

  const startFinalizeHold = (event) => {
    if (phase !== "complete" || !isAwaitingFinalClose) return;
    event.preventDefault();
    cancelFinalizeHold();
    const startAt = Date.now();
    finalHoldIntervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startAt) / FINALIZE_HOLD_MS) * 100);
      setFinalHoldProgress(pct);
    }, 30);
    finalHoldTimeoutRef.current = setTimeout(() => {
      finalizeCompleteSession();
    }, FINALIZE_HOLD_MS);
  };

  const formatSeconds = (ms) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const inhaleStyle = {
    "--phase-duration": `${config.inhaleSeconds}s`
  };

  const exhaleStyle = {
    "--phase-duration": `${config.exhaleSeconds}s`
  };

  const phaseStyle = () => {
    if (phase === "breathing" && subphase === "inhale") return inhaleStyle;
    if (phase === "breathing" && subphase === "exhale") return exhaleStyle;
    if (phase === "apnea" || phase === "recovery") return { animationDuration: "6s" };
    return {};
  };

  const phaseClass = () => {
    if (phase === "apnea") return "apnea";
    if (phase === "breathing" && subphase === "inhale") return "inhale";
    if (phase === "breathing" && subphase === "exhale") return "exhale";
    if (phase === "recovery") return "recovery";
    return "idle";
  };

  const nostrilState = useMemo(() => {
    if (phase !== "breathing") return "both";
    return getNostrilState(config.breathStyle, currentBreathNumber);
  }, [phase, config.breathStyle, currentBreathNumber]);

  const nextNostrilState = useMemo(() => {
    if (phase !== "breathing") return "none";
    if (currentBreathNumber >= config.breathsPerCycle) return "none";
    return getNostrilState(config.breathStyle, currentBreathNumber + 1);
  }, [phase, config.breathStyle, currentBreathNumber, config.breathsPerCycle]);

  const glowNostrilState = useMemo(() => {
    if (phase !== "breathing") return "both";
    const isAboutToSwitch =
      subphase === "exhale" &&
      nextNostrilState !== "none" &&
      timeLeftMs <= NOSTRIL_PREVIEW_MS;
    if (isAboutToSwitch) return nextNostrilState;
    return nostrilState;
  }, [phase, subphase, timeLeftMs, nextNostrilState, nostrilState]);

  const renderHeader = () => (
    <header className="header">
      <div>
        <p className="eyebrow">
          {practiceScreen === "daily-goals"
            ? "Metas Diarias"
            : practiceScreen === "color-vision"
              ? "Visualizacion de colores"
              : "Reprogramación mental"}
        </p>
        {!brandLogoMissing && (
          <img
            className={`brand-logo ${theme === "dark" ? "logo-theme-dark" : "logo-theme-light"}`}
            src="/logo-10.png"
            alt="Cortex"
            onError={() => setBrandLogoMissing(true)}
          />
        )}
        {brandLogoMissing && <h1 className="brand-fallback">Reprogramación Mental / Cortex</h1>}
      </div>
      <div className="header-controls">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <div className="student-chip">
          <span>Estudiante</span>
          <strong>{student?.name || "Sin asignación"}</strong>
        </div>
      </div>
    </header>
  );

  const buildStudentLink = (studentSlug, studentToken, includeToken) => {
    const origin = window.location.origin;
    const tokenParam =
      includeToken && studentToken ? `?t=${studentToken}` : "";
    return `${origin}/s/${studentSlug}${tokenParam}`;
  };

  const copyLink = async (studentSlug, studentToken, includeToken) => {
    const link = buildStudentLink(studentSlug, studentToken, includeToken);
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado.");
    } catch (error) {
      window.prompt("Copia el link:", link);
    }
  };

  const copyToken = async (studentToken) => {
    if (!studentToken) return;
    try {
      await navigator.clipboard.writeText(studentToken);
      alert("Token copiado.");
    } catch (error) {
      window.prompt("Copia el token:", studentToken);
    }
  };

  const executeDoubleTapAction = () => {
    const now = Date.now();
    if (now - lastDoubleTapActionRef.current < 420) return;
    lastDoubleTapActionRef.current = now;

    if (phase === "recovery") return;
    if (!isRunning) {
      startSession();
      return;
    }
    if (phase === "breathing") {
      startApnea();
      return;
    }
    if (phase === "apnea") {
      startRecovery();
    }
  };

  const handleBackToMenu = () => {
    countdownAbortRef.current = true;
    setStartCountdown(0);
    if (isRunningRef.current) {
      stopSession();
    }
    setPracticeScreen("menu");
  };

  const openPracticeOption = (practiceId) => {
    if (practiceId === "metas") {
      setPracticeScreen("daily-goals");
      return;
    }
    if (practiceId === "colores") {
      if (!hasColorPracticeAccess(student)) return;
      setPracticeScreen("color-vision");
      return;
    }
    setPracticeScreen("practice");
  };

  const onPointerUp = (event) => {
    if (event.pointerType && event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      executeDoubleTapAction();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const onAppDoubleClick = (event) => {
    event.preventDefault();
    executeDoubleTapAction();
  };

  const isAdminRoute = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) return;
    if (adminPassword) {
      ensureAdminList(adminPassword);
      ensureAdminsRegistry(adminPassword);
    }
  }, [isAdminRoute, adminPassword]);

  const ensureAdminList = async (password) => {
    setAdminStatus("loading");
    setAdminMessage("");
    try {
      const response = await fetch(`/api/admin/list?password=${encodeURIComponent(password)}`);
      if (!response.ok) throw new Error("No autorizado");
      const data = await response.json();
      setAdminStudents(Array.isArray(data.students) ? data.students : []);
      setAdminStatus("ready");
      return true;
    } catch (error) {
      setAdminStatus("auth-error");
      setAdminMessage("Password incorrecto o sin acceso.");
      return false;
    }
  };

  const ensureAdminsRegistry = async (password) => {
    setAdminManagerMessage("");
    try {
      const response = await fetch(`/api/admin/admins?password=${encodeURIComponent(password)}`);
      if (!response.ok) return;
      const data = await response.json();
      setAdminsList(Array.isArray(data.admins) ? data.admins : []);
    } catch (error) {
      // silent
    }
  };

  const handleAdminLogin = async () => {
    if (!adminPassword) return;
    sessionStorage.setItem("rmcortex_admin_pw", adminPassword);
    await ensureAdminList(adminPassword);
    await ensureAdminsRegistry(adminPassword);
  };

  const handleCreateAdmin = async () => {
    if (!adminPassword || !newAdminName || !newAdminPassword) {
      setAdminManagerMessage("Completa nombre y password de administrador.");
      return;
    }
    const expected = `CONFIRMAR ${newAdminName.trim()}`;
    if (newAdminConfirmation.trim() !== expected || !newAdminConfirmedTwice) {
      setAdminManagerMessage(`Doble confirmación requerida: ${expected}`);
      return;
    }
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name: newAdminName,
          adminPassword: newAdminPassword,
          confirmationText: newAdminConfirmation,
          confirmedTwice: newAdminConfirmedTwice
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo crear administrador");
      }
      setNewAdminName("");
      setNewAdminPassword("");
      setNewAdminConfirmation("");
      setNewAdminConfirmedTwice(false);
      await ensureAdminsRegistry(adminPassword);
      setAdminManagerMessage("Administrador creado.");
    } catch (error) {
      setAdminManagerMessage(error?.message || "No se pudo crear administrador.");
    }
  };

  const handleRemoveAdmin = async (name) => {
    if (!adminPassword) return;
    const confirmationText = window.prompt(`Escribe exactamente: ELIMINAR ${name}`);
    if (!confirmationText) return;
    const confirmedTwice = window.confirm("¿Seguro? Esta acción elimina acceso de administrador.");
    if (!confirmedTwice) return;
    try {
      const response = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name,
          confirmationText,
          confirmedTwice
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "No se pudo eliminar");
      await ensureAdminsRegistry(adminPassword);
      setAdminManagerMessage("Administrador eliminado.");
    } catch (error) {
      setAdminManagerMessage(error?.message || "No se pudo eliminar administrador.");
    }
  };

  const handleImportSeguimiento = async () => {
    if (!adminPassword) {
      setAdminBridgeMessage("Ingresa password de admin.");
      return;
    }
    const confirmImport = window.confirm(
      "Esto sincroniza estudiantes desde Seguimiento v2 a Cortex. ¿Continuar?"
    );
    if (!confirmImport) return;

    setAdminBridgeLoading(true);
    setAdminBridgeMessage("");
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo sincronizar");
      }
      await ensureAdminList(adminPassword);
      setAdminBridgeMessage(
        `Sincronizado: ${data.created || 0} nuevos, ${data.updated || 0} actualizados, total ${data.totalStudents || 0}.`
      );
    } catch (error) {
      setAdminBridgeMessage(error?.message || "No se pudo sincronizar.");
    } finally {
      setAdminBridgeLoading(false);
    }
  };

  const readFileBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("No se pudo leer archivo"));
      reader.readAsDataURL(file);
    });

  const directUploadToR2 = async (file) => {
    const signRes = await fetch("/api/admin/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: adminPassword,
        fileName: file.name
      })
    });
    const signPayload = await signRes.json().catch(() => ({}));
    if (!signRes.ok || !signPayload?.uploadUrl || !signPayload?.key) {
      throw new Error(signPayload?.error || "No se pudo preparar subida directa");
    }

    const putRes = await fetch(signPayload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "audio/mpeg"
      },
      body: file
    });
    if (!putRes.ok) {
      throw new Error("No se pudo subir audio directo a R2");
    }
    return signPayload.key;
  };

  const optimizeStudentAudioDeferred = async (slugToOptimize) => {
    if (!slugToOptimize || !adminPassword) return;
    try {
      const response = await fetch("/api/admin/optimize-student-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          slug: slugToOptimize
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo optimizar");
      }
      await ensureAdminList(adminPassword);
      const opt = payload?.optimization;
      if (opt?.applied) {
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        setAdminMessage(`Audio optimizado en segundo plano: ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Audio procesado en segundo plano.");
      }
    } catch (error) {
      setAdminMessage("Audio subido, pero no se pudo optimizar automáticamente.");
    }
  };

  const handleAdminCreate = async () => {
    if (!adminPassword || !adminName || !adminFile) {
      setAdminMessage("Completa nombre y audio.");
      return;
    }
    setAdminStatus("loading");
    setAdminMessage("");
    setAdminLink("");
    try {
      const isLarge = adminFile.size > DIRECT_UPLOAD_THRESHOLD_BYTES;
      const payloadBase = {
        password: adminPassword,
        name: adminName
      };
      const payloadBody = isLarge
        ? {
            ...payloadBase,
            audioKey: await directUploadToR2(adminFile)
          }
        : {
            ...payloadBase,
            fileName: adminFile.name,
            contentType: adminFile.type || "audio/mpeg",
            audioBase64: await readFileBase64(adminFile)
          };
      const addRes = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      if (!addRes.ok) {
        const detail = await addRes.json().catch(() => ({}));
        throw new Error(`No se pudo crear estudiante (${detail?.error || "error"}).`);
      }
      const payload = await addRes.json();
      const created = payload.student;
      const link = buildStudentLink(created.slug, created.token, true);
      setAdminLink(link);
      setAdminName("");
      setAdminFile(null);
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      if (isLarge) {
        setAdminMessage("Estudiante creado. Audio grande subido. Iniciando optimización automática...");
        optimizeStudentAudioDeferred(created.slug);
      } else if (payload?.optimization) {
        const opt = payload.optimization;
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        const mode = opt.mode || "procesado";
        setAdminMessage(`Estudiante creado. Audio ${mode}: ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Estudiante creado.");
      }
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo crear el estudiante.");
    }
  };

  const handleAdminDelete = async (slugToDelete) => {
    if (!adminPassword) return;
    const confirmed = window.confirm("¿Eliminar este estudiante?");
    if (!confirmed) return;
    try {
      const response = await fetch("/api/admin/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, slug: slugToDelete })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo eliminar");
      }
      await ensureAdminList(adminPassword);
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo eliminar");
    }
  };

  const handleReplaceClick = (slugToUpdate) => {
    setReplaceSlug(slugToUpdate);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
      replaceInputRef.current.click();
    }
  };

  const handleAdminReplace = async (file) => {
    if (!adminPassword || !replaceSlug || !file) return;
    setAdminStatus("loading");
    setAdminMessage("");
    try {
      const slugToReplace = replaceSlug;
      const isLarge = file.size > DIRECT_UPLOAD_THRESHOLD_BYTES;
      const payloadBody = isLarge
        ? {
            password: adminPassword,
            slug: slugToReplace,
            audioKey: await directUploadToR2(file)
          }
        : {
            password: adminPassword,
            slug: slugToReplace,
            fileName: file.name,
            contentType: file.type || "audio/mpeg",
            audioBase64: await readFileBase64(file)
          };
      const updateRes = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      if (!updateRes.ok) {
        const detail = await updateRes.json().catch(() => ({}));
        throw new Error(detail?.error || "No se pudo actualizar");
      }
      const payload = await updateRes.json().catch(() => ({}));
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      if (isLarge) {
        setAdminMessage("Audio reemplazado. Iniciando optimización automática...");
        optimizeStudentAudioDeferred(slugToReplace);
      } else if (payload?.optimization) {
        const opt = payload.optimization;
        const fromMb = (opt.originalBytes / (1024 * 1024)).toFixed(2);
        const toMb = (opt.finalBytes / (1024 * 1024)).toFixed(2);
        const mode = opt.mode || "procesado";
        setAdminMessage(`Audio reemplazado (${mode}): ${fromMb}MB -> ${toMb}MB`);
      } else {
        setAdminMessage("Audio reemplazado.");
      }
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo reemplazar el audio.");
    }
  };

  const handleToggleColorPractice = async (slugToUpdate, enabled) => {
    if (!adminPassword || !slugToUpdate) return;
    try {
      const response = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          slug: slugToUpdate,
          settings: {
            features: {
              colorVisionEnabled: enabled
            }
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo actualizar acceso");
      }
      await ensureAdminList(adminPassword);
      setAdminMessage(enabled ? "Color habilitado para estudiante." : "Color deshabilitado para estudiante.");
    } catch (error) {
      setAdminMessage(error?.message || "No se pudo cambiar acceso de color.");
    }
  };

  const adminRowsForView = useMemo(() => {
    if (adminView === "active") return adminAnalytics.active;
    if (adminView === "alerts") {
      return [...adminAnalytics.critical, ...adminAnalytics.warning]
        .sort((a, b) => b.inactiveHours - a.inactiveHours);
    }
    return filteredAdminStudents.map((item) => {
      const found = adminAnalytics.rows.find((row) => row.slug === item.slug);
      return found || item;
    });
  }, [adminAnalytics, adminView, filteredAdminStudents]);

  if (loading) {
    return (
      <div className="app">
        {renderHeader()}
        <p className="status">Cargando configuración...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app">
        {renderHeader()}
        <p className="status error">{loadError}</p>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card">
          <h2>Panel de administrador</h2>
          <p className="muted">Crea estudiantes y sube sus audios sin salir de aquí.</p>
          <div className="admin-login">
            <input
              type="password"
              placeholder="Password de admin"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
            <button className="secondary" onClick={handleAdminLogin}>
              Entrar
            </button>
          </div>
          {adminStatus === "auth-error" && <p className="status error">{adminMessage}</p>}
        </div>

        {adminStatus === "ready" && (
          <>
            <div className={`card admin-overview-card ${adminAnalytics.hasAttention ? "attention" : ""}`}>
              <div className="admin-overview-head">
                <h3>Panel de control</h3>
                <span className={`alert-pill ${adminAnalytics.hasAttention ? "critical" : "ok"}`}>
                  {adminAnalytics.hasAttention ? "Revisar alertas" : "Todo en orden"}
                </span>
              </div>
              <div className="stats-grid">
                <div>
                  <span>Estudiantes activos</span>
                  <strong>{adminAnalytics.active.length}</strong>
                </div>
                <div>
                  <span>Alerta 48h</span>
                  <strong>{adminAnalytics.warning.length}</strong>
                </div>
                <div>
                  <span>Alerta 72h</span>
                  <strong>{adminAnalytics.critical.length}</strong>
                </div>
                <div>
                  <span>Más de 1 sesión hoy</span>
                  <strong>{adminAnalytics.moreThanOnceToday.length}</strong>
                </div>
              </div>
              <div className="muted">
                Diario: {adminAnalytics.practicingDaily.length} practicaron hoy. Abandono potencial: {adminAnalytics.abandoned.length}.
              </div>
            </div>

            <div className="card">
              <h3>Administradores (v2)</h3>
              <p className="muted">Solo el administrador principal puede crear o eliminar administradores secundarios.</p>
              <div className="audio-tools">
                <button
                  className="ghost"
                  onClick={() => window.open(SEGUIMIENTO_DASHBOARD_URL, "_blank", "noopener,noreferrer")}
                >
                  Abrir dashboard Seguimiento
                </button>
                {adminStudents.length === 0 && (
                  <button className="secondary" onClick={handleImportSeguimiento} disabled={adminBridgeLoading}>
                    {adminBridgeLoading ? "Sincronizando..." : "Importacion inicial de alumnos"}
                  </button>
                )}
                {adminBridgeMessage && <span className="muted">{adminBridgeMessage}</span>}
              </div>
              <div className="form-grid">
                <label>
                  Nombre admin
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(event) => setNewAdminName(event.target.value)}
                  />
                </label>
                <label>
                  Password admin
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(event) => setNewAdminPassword(event.target.value)}
                  />
                </label>
                <label>
                  Doble confirmación
                  <input
                    type="text"
                    placeholder={newAdminName ? `CONFIRMAR ${newAdminName}` : "CONFIRMAR nombre"}
                    value={newAdminConfirmation}
                    onChange={(event) => setNewAdminConfirmation(event.target.value)}
                  />
                </label>
              </div>
              <div className="audio-tools">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={newAdminConfirmedTwice}
                    onChange={(event) => setNewAdminConfirmedTwice(event.target.checked)}
                  />
                  Confirmo por segunda vez que deseo crear este administrador.
                </label>
                <button className="secondary" onClick={handleCreateAdmin}>
                  Crear administrador
                </button>
                {adminManagerMessage && <span className="muted">{adminManagerMessage}</span>}
              </div>
              <div className="link-list">
                {adminsList.map((admin) => (
                  <div key={admin.name} className="link-row">
                    <div>
                      <strong>{admin.name}</strong>
                      <div className="muted">Creado: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "-"}</div>
                    </div>
                    <div className="link-actions">
                      <button className="ghost" onClick={() => handleRemoveAdmin(admin.name)}>
                        Eliminar admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Nuevo estudiante</h3>
              <div className="form-grid">
                <label>
                  Nombre
                  <input
                    type="text"
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                  />
                </label>
                <label>
                  Audio (apnea)
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setAdminFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="audio-tools">
                <button className="primary" onClick={handleAdminCreate}>
                  Crear estudiante
                </button>
                {adminStatus === "loading" && (
                  <span className="muted">Procesando…</span>
                )}
                {adminMessage && <span className="muted">{adminMessage}</span>}
              </div>
              {adminLink && (
                <div className="summary">
                  Link listo: <span className="code">{adminLink}</span>
                </div>
              )}
            </div>

            <div className="card">
              <div className="panel-actions">
                <h3>Estudiantes</h3>
                <div className="admin-tabs">
                  <button
                    className={`chip ${adminView === "students" ? "active" : ""}`}
                    onClick={() => setAdminView("students")}
                  >
                    Todos
                  </button>
                  <button
                    className={`chip ${adminView === "active" ? "active" : ""}`}
                    onClick={() => setAdminView("active")}
                  >
                    Activos
                  </button>
                  <button
                    className={`chip ${adminView === "alerts" ? "active" : ""}`}
                    onClick={() => setAdminView("alerts")}
                  >
                    Alertas
                  </button>
                </div>
              </div>
              <div className="panel-actions">
                <input
                  type="search"
                  placeholder="Buscar estudiante…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <span className="muted">
                  {adminRowsForView.length} / {adminStudents.length}
                </span>
              </div>
              <div className="link-list">
                {adminRowsForView
                  .map((item) => (
                    <div key={item.slug} className={`link-row ${item.alertLevel === "critical" ? "row-critical" : ""}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted">{item.slug}</div>
                        {item.createdAt && (
                          <div className="muted">Creado: {new Date(item.createdAt).toLocaleDateString()}</div>
                        )}
                        <div className="muted">
                          Visualizacion de colores: {item.features?.colorVisionEnabled ? "habilitada" : "bloqueada"}
                        </div>
                        {item.usage?.lastSessionAt && (
                          <div className="muted">
                            Última práctica: {new Date(item.usage.lastSessionAt).toLocaleString()}
                          </div>
                        )}
                        {adminView !== "students" && (
                          <div className="muted">
                            Sesiones: {item.totalSessions || 0} · Rondas: {item.totalRounds || 0}
                            {Array.isArray(item.roundAvg) && item.roundAvg.length > 0
                              ? ` · Promedio apnea R1-R5: ${item.roundAvg.map((v, idx) => `R${idx + 1}:${v || 0}s`).join(" | ")}`
                              : ""}
                          </div>
                        )}
                        <div className="muted">
                          Flujo O/Pre/Pra: {item.onboardingSessions || 0}/{item.prePracticeSessions || 0}/{item.practiceSessions || 0}
                          {item.colorVisionSessions
                            ? ` · Color: ${item.colorVisionSessions} sesiones (${Math.round(item.colorVisionAccuracy || 0)}% prom.)`
                            : ""}
                        </div>
                        <div className="flow-semaforo" aria-label="Estado de flujo del alumno">
                          <span className={`flow-dot ${item.flowState?.onboarding ? "on" : "off"}`} />
                          <span className={`flow-dot ${item.flowState?.prePractice ? "on" : "off"}`} />
                          <span className={`flow-dot ${item.flowState?.practice ? "on" : "off"}`} />
                          <span className="muted flow-legend">Onboarding · Pre-práctica · Práctica</span>
                        </div>
                        {item.alertLevel === "warning" && (
                          <div className="warn">Alerta 48h sin práctica</div>
                        )}
                        {item.alertLevel === "critical" && (
                          <div className="warn">Alerta roja 72h sin práctica</div>
                        )}
                      </div>
                      <div className="link-actions">
                        <button
                          className="secondary"
                          onClick={() => copyLink(item.slug, item.token, false)}
                        >
                          Copiar link
                        </button>
                        <button
                          className="primary"
                          onClick={() => copyLink(item.slug, item.token, true)}
                        >
                          Copiar link con token
                        </button>
                        <button
                          className="ghost"
                          onClick={() => copyToken(item.token)}
                        >
                          Copiar token
                        </button>
                        <a
                          className="ghost link-button"
                          href={buildStudentLink(item.slug, item.token, true)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir link
                        </a>
                        <button
                          className="secondary"
                          onClick={() => handleReplaceClick(item.slug)}
                        >
                          Reemplazar audio
                        </button>
                        <button
                          className={item.features?.colorVisionEnabled ? "primary" : "secondary"}
                          onClick={() =>
                            handleToggleColorPractice(item.slug, !item.features?.colorVisionEnabled)
                          }
                        >
                          {item.features?.colorVisionEnabled ? "Color ON" : "Color OFF"}
                        </button>
                        <button
                          className="ghost"
                          onClick={() => handleAdminDelete(item.slug)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                {adminRowsForView.length === 0 && (
                  <p className="muted">
                    {adminStudents.length === 0
                      ? "Aún no hay estudiantes cargados."
                      : "Sin resultados para esa vista."}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card">
          <h2>Link único requerido</h2>
          <p>Abre la app con un link como:</p>
          <div className="code">https://tu-dominio.vercel.app/s/tu-slug</div>
          <p>También puedes usar <span className="code">?s=tu-slug</span>.</p>
          <p className="muted">Si eres administrador, entra al panel para crear estudiantes y links.</p>
          <div className="audio-tools">
            <a className="secondary link-button" href="/admin">
              Ir al panel admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card">
          <h2>Estudiante no encontrado</h2>
          <p>Revisa el slug en el link y confirma que exista en <span className="code">public/students.json</span>.</p>
        </div>
      </div>
    );
  }

  if (practiceScreen === "menu") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card menu-card">
          <h2>Selecciona practica</h2>
          <p className="muted">Reprogramacion mental y Metas Diarias están activas. Visualizacion de colores depende del permiso por estudiante.</p>
          <div className="practice-menu">
            {practiceOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`menu-button ${item.enabled ? "enabled" : "disabled"}`}
                onClick={item.enabled ? () => openPracticeOption(item.id) : undefined}
                disabled={!item.enabled}
              >
                {item.label}
                {!item.enabled && <span>{item.id === "colores" ? "Bloqueado" : "Proximamente"}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (practiceScreen === "daily-goals") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <DailyGoalsModule
          allowAdmin={false}
          fixedStudent={{
            id: student?.slug || "",
            name: student?.name || "Estudiante",
            slug: student?.slug || "",
            token
          }}
        />
      </div>
    );
  }

  if (practiceScreen === "color-vision") {
    if (!hasColorPracticeAccess(student)) {
      return (
        <div className="app">
          {renderHeader()}
          <div className="practice-nav">
            <button type="button" className="ghost" onClick={handleBackToMenu}>
              Volver al menu
            </button>
          </div>
          <section className="card">
            <h3>Visualizacion de colores</h3>
            <p className="muted">Tu acceso no está activado todavía. Pide habilitación al administrador.</p>
          </section>
        </div>
      );
    }
    return (
      <div className="app">
        {renderHeader()}
        <div className="practice-nav">
          <button type="button" className="ghost" onClick={handleBackToMenu}>
            Volver al menu
          </button>
        </div>
        <section className="card color-practice-shell">
          <p className="eyebrow">Visualizacion de colores</p>
          <h3>Entrenamiento de cartulinas</h3>
          <p className="muted">Detector con cámara, calibración por color y reporte final.</p>
          <iframe
            className="color-practice-iframe"
            src={`/cartulinas/index.html?student=${encodeURIComponent(student?.name || "")}&slug=${encodeURIComponent(
              student?.slug || ""
            )}&token=${encodeURIComponent(token || "")}`}
            title="Practica de visualizacion de colores"
            allow="camera; microphone"
          />
        </section>
      </div>
    );
  }

  return (
    <div className="app" onPointerUp={onPointerUp} onDoubleClick={onAppDoubleClick}>
      {renderHeader()}
      <div className="practice-nav">
        <button type="button" className="ghost" onClick={handleBackToMenu}>
          Volver al menu
        </button>
      </div>

      <main className="grid">
        <section className="session card">
          <div className="session-header">
            <div>
              <p className="eyebrow">{PHASE_LABELS[phase]}</p>
              <h2>{phase === "complete" ? "Buen trabajo" : "Sesión en curso"}</h2>
            </div>
            <div className="timer-wrap">
              <div className="timer">
                {phase === "idle" || phase === "complete" ? "--:--" : formatSeconds(timeLeftMs)}
              </div>
              {!isRunning && startCountdown > 0 && (
                <div className="timer-sub">Comienza en {startCountdown}...</div>
              )}
              {phase === "apnea" && previousApneaSeconds > 0 && (
                <div className="timer-sub">Apnea anterior: {formatSeconds(previousApneaSeconds * 1000)}</div>
              )}
            </div>
          </div>

          <div className="breath-visual">
            {phase === "breathing" && (
              <div className="breath-counter-top">
                <strong>{currentBreathNumber}</strong>
                <span>{getNostrilHint(nostrilState)}</span>
                <div className="nostril-preview" aria-label="Siguiente respiración">
                  <span className={`nostril-dot ${nextNostrilState === "left" ? "active" : ""}`} />
                  <span className={`nostril-dot ${nextNostrilState === "both" ? "active" : ""}`} />
                  <span className={`nostril-dot ${nextNostrilState === "right" ? "active" : ""}`} />
                </div>
              </div>
            )}

            <div className={`breath-orb ${phaseClass()} nostril-${glowNostrilState}`} style={phaseStyle()}>
              {!breathLogoMissing && (
                <img
                  className={`breath-logo ${theme === "dark" ? "logo-theme-dark" : "logo-theme-light"}`}
                  src="/logo-05.png"
                  alt="Cortex breath"
                  onError={() => setBreathLogoMissing(true)}
                />
              )}
              {breathLogoMissing && <div className="breath-logo-fallback">Falta /public/logo-05.png</div>}
            </div>
            <div className="breath-text">
              {phase === "breathing" && subphase === "inhale" && "Inhala"}
              {phase === "breathing" && subphase === "exhale" && "Exhala"}
              {phase === "apnea" && "Mantén la apnea"}
              {phase === "recovery" && "Recupera"}
              {(phase === "idle" || phase === "complete") && "Preparado"}
            </div>
          </div>

          <div className="session-meta">
            <div>
              <span>Ciclo</span>
              <strong>{cycleIndex} / {config.cycles}</strong>
            </div>
            <div>
              <span>Respiraciones</span>
              <strong>{breathsDone} / {config.breathsPerCycle}</strong>
            </div>
            <div>
              <span>Audio apnea</span>
              <strong>{student ? "Asignado" : "No"}</strong>
            </div>
          </div>

          <div className="actions">
            {!isRunning && (
              <button
                className="primary"
                onClick={startSession}
                disabled={audioCheckStatus === "checking" || isStarting || startCountdown > 0}
              >
                {audioCheckStatus === "checking"
                  ? "Chequeando audio..."
                  : isStarting
                    ? "Iniciando..."
                  : startCountdown > 0
                    ? `Inicia en ${startCountdown}...`
                    : "Iniciar sesión"}
              </button>
            )}
            {isRunning && !isPaused && phase !== "complete" && (
              <button className="secondary" onClick={pauseSession}>Pausar</button>
            )}
            {isRunning && isPaused && phase !== "complete" && (
              <button className="secondary" onClick={resumeSession}>Reanudar</button>
            )}
            {isRunning && phase !== "complete" && phase !== "apnea" && (
              <button
                className="ghost hold-to-end"
                style={{ "--hold-pct": `${stopHoldProgress}%` }}
                onPointerDown={startStopHold}
                onPointerUp={cancelStopHold}
                onPointerLeave={cancelStopHold}
                onPointerCancel={cancelStopHold}
              >
                <span>Mantener 1s para detener</span>
              </button>
            )}
            {phase === "apnea" && (
              <button
                className="primary hold-to-end"
                style={{ "--hold-pct": `${endHoldProgress}%` }}
                onPointerDown={startEndApneaHold}
                onPointerUp={cancelEndApneaHold}
                onPointerLeave={cancelEndApneaHold}
                onPointerCancel={cancelEndApneaHold}
              >
                <span>Mantener 1.5s para terminar apnea</span>
              </button>
            )}
            {phase === "complete" && isAwaitingFinalClose && (
              <button
                className="primary hold-to-end"
                style={{ "--hold-pct": `${finalHoldProgress}%` }}
                onPointerDown={startFinalizeHold}
                onPointerUp={cancelFinalizeHold}
                onPointerLeave={cancelFinalizeHold}
                onPointerCancel={cancelFinalizeHold}
              >
                <span>Mantener 1.5s para finalizar ejercicio</span>
              </button>
            )}
          </div>

          <audio ref={audioRef} src={audioSrc} preload="auto" playsInline />
          <audio ref={breathAudioRef} preload="auto" playsInline />
          <audio
            ref={bosqueAudioRef}
            preload="auto"
            playsInline
            onEnded={reviveAmbientIfNeeded}
            onPause={() => {
              setTimeout(reviveAmbientIfNeeded, 120);
            }}
          />
          <audio ref={endApneaAudioRef} preload="auto" playsInline />
          <audio
            ref={septasyncAudioRef}
            preload="auto"
            playsInline
            onEnded={reviveSeptasyncIfNeeded}
            onPause={() => {
              setTimeout(reviveSeptasyncIfNeeded, 120);
            }}
          />
          <audio ref={preApneaCueAudioRef} src="/pre-apnea-cue.mp3" preload="auto" playsInline />
          <audio ref={finalApneaCueAudioRef} src="/finaliza-ultima-apnea.mp3" preload="auto" playsInline />
        </section>

        <section className="card">
          <h3>Configuración rápida</h3>
          <p className="muted">Presets rápidos para no tocar sliders en cada sesión.</p>

          <div className="preset-group">
            <div className="preset-label">Estilo respiración</div>
            <div className="preset-row">
              {BREATH_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${config.breathStyle === option.id ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      breathStyle: option.id
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="muted">
              Activacion: ambas fosas. Confort: 3 ambas + 3 izquierda + 3 derecha. Reset: alterna izquierda/derecha con cierre en ambas.
            </span>
          </div>

          <div className="preset-group">
            <div className="preset-label">Velocidad respiración</div>
            <div className="preset-row">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${config.inhaleSeconds === option.value && config.exhaleSeconds === option.value ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      inhaleSeconds: option.value,
                      exhaleSeconds: option.value
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Respiraciones por ciclo</div>
            <div className="preset-row">
              {BREATHS_OPTIONS.map((value) => (
                <button
                  key={`breaths-${value}`}
                  type="button"
                  className={`chip ${config.breathsPerCycle === value ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      breathsPerCycle: value
                    }))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Ciclos</div>
            <div className="preset-row">
              {CYCLES_OPTIONS.map((value) => (
                <button
                  key={`cycles-${value}`}
                  type="button"
                  className={`chip ${config.cycles === value ? "active" : ""}`}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      cycles: value
                    }))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="preset-group">
            <div className="preset-label">Sonido ambiente</div>
            <div className="preset-row">
              <button
                type="button"
                className={`chip ${config.ambientSound === "bosque" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "bosque" }))}
              >
                Bosque
              </button>
              <button
                type="button"
                className={`chip ${config.ambientSound === "oceano" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "oceano" }))}
              >
                Oceano
              </button>
              <button
                type="button"
                className={`chip ${config.ambientSound === "none" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ambientSound: "none" }))}
              >
                Sin sonido
              </button>
            </div>
            <label>
              Volumen ambiente
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.bosqueVolume}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    bosqueVolume: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>

          <div className="preset-group">
            <div className="preset-label">Septasync</div>
            <div className="preset-row">
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "balance" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "balance" }))}
              >
                Balance
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "gamma" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "gamma" }))}
              >
                Gamma
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "trance" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "trance" }))}
              >
                Trance
              </button>
              <button
                type="button"
                className={`chip ${config.septasyncTrack === "none" ? "active" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, septasyncTrack: "none" }))}
              >
                Off
              </button>
            </div>
            <label>
              Volumen Septasync
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.septasyncVolume}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    septasyncVolume: Number(event.target.value)
                  }))
                }
              />
            </label>
            <span className="muted">Septasync activo durante la sesión (volumen independiente).</span>
          </div>

          <div className="audio-tools">
            <button
              type="button"
              className="secondary"
              onClick={() => setManualConfigOpen((prev) => !prev)}
            >
              {manualConfigOpen ? "Ocultar manual" : "Manual"}
            </button>
          </div>

          {manualConfigOpen && (
            <div className="form-grid">
              <label>
                Respiraciones por ciclo
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.breathsPerCycle}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      breathsPerCycle: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Inhalar (segundos)
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.inhaleSeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      inhaleSeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Exhalar (segundos)
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.exhaleSeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      exhaleSeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Recuperación (segundos)
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.recoverySeconds}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      recoverySeconds: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Ciclos
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={config.cycles}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      cycles: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Volumen audio apnea
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.audioVolume}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      audioVolume: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Reverb audio apnea
                <div className="preset-row" style={{ marginBottom: 8 }}>
                  {REVERB_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip ${config.reverbMode === option.id ? "active" : ""}`}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          reverbMode: option.id
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.reverbMix}
                  disabled={config.reverbMode === "off"}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      reverbMix: Number(event.target.value)
                    }))
                  }
                />
                <span className="muted">
                  {config.reverbMode === "camera"
                    ? "Modo camara: reverb mas notorio."
                    : config.reverbMode === "soft"
                      ? "Modo suave: reverb ligero."
                      : "Off: sin reverb."}
                </span>
              </label>
            </div>
          )}

          <div className="audio-tools">
            <button className="secondary" onClick={runAudioCheck}>
              Chequear audios
            </button>
            <button className="secondary" onClick={previewAudio}>
              Probar audio
            </button>
            <button className="ghost" onClick={resetConfig}>
              Resetear ajustes
            </button>
            <span className="muted">
              Ajusta el volumen antes de iniciar la sesión.
            </span>
            {audioStatus === "loading" && (
              <span className="muted">Preparando audio…</span>
            )}
            {audioStatus === "error" && (
              <span className="muted">No se pudo cargar el audio.</span>
            )}
            {audioCheckMessage && (
              <span className="muted">{audioCheckMessage}</span>
            )}
          </div>
        </section>

        {phase === "complete" && (
          <section className="card">
            <h3>Seguimiento local</h3>
            <div className="stats-grid">
              <div>
                <span>Sesiones totales</span>
                <strong>{progress.totalSessions || 0}</strong>
              </div>
              <div>
                <span>Respiraciones totales</span>
                <strong>{progress.totalBreaths || 0}</strong>
              </div>
              <div>
                <span>Racha</span>
                <strong>{progress.streak || 0} días</strong>
              </div>
              <div>
                <span>Última sesión</span>
                <strong>{progress.lastSessionDate || "-"}</strong>
              </div>
              <div>
                <span>Última apnea</span>
                <strong>{progress.lastApneaSeconds || 0}s</strong>
              </div>
            </div>
            {progress.lastSummary && (
              <div className="summary">
                Última sesión: {progress.lastSummary.cycles} ciclos / {progress.lastSummary.breaths} respiraciones / apnea {progress.lastSummary.apneaSeconds || 0}s
              </div>
            )}
            {progress.apneaHistory && progress.apneaHistory.length > 0 && (
              <div className="history">
                <div className="history-title">Historial de apnea</div>
                <div className="history-list">
                  {progress.apneaHistory.map((entry, index) => (
                    <div key={`${entry.timestamp || entry.date}-${index}`} className="history-item">
                      <span>{entry.date}</span>
                      <strong>{entry.seconds}s</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <input
        ref={replaceInputRef}
        className="hidden-input"
        type="file"
        accept="audio/*"
        onChange={(event) => handleAdminReplace(event.target.files?.[0] || null)}
      />
    </div>
  );
}
