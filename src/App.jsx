import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CONFIG = {
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  recoverySeconds: 15,
  cycles: 3,
  audioVolume: 0.8,
  bosqueVolume: 0.5,
  ambientSound: "bosque",
  septasyncTrack: "none",
  septasyncVolume: 0.5
};

const PHASE_LABELS = {
  idle: "Listo para iniciar",
  breathing: "Respiración guiada",
  apnea: "Apnea",
  recovery: "Recuperación",
  complete: "Sesión completada"
};

const TICK_MS = 100;
const DOUBLE_TAP_MS = 280;

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

const BREATHS_OPTIONS = [36, 42, 48];
const CYCLES_OPTIONS = [3, 5, 8, 15];

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
  const [replaceSlug, setReplaceSlug] = useState("");
  const [manualConfigOpen, setManualConfigOpen] = useState(false);
  const [brandLogoMissing, setBrandLogoMissing] = useState(false);
  const [breathLogoMissing, setBreathLogoMissing] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [audioSrc, setAudioSrc] = useState("");
  const [audioStatus, setAudioStatus] = useState("idle");
  const [audioCheckStatus, setAudioCheckStatus] = useState("idle");
  const [audioCheckMessage, setAudioCheckMessage] = useState("");
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
  const [endHoldProgress, setEndHoldProgress] = useState(0);

  const [progress, setProgress] = useState({
    totalSessions: 0,
    totalBreaths: 0,
    streak: 0,
    lastSessionDate: "",
    lastSummary: null,
    lastApneaSeconds: 0,
    apneaHistory: []
  });

  const audioRef = useRef(null);
  const breathAudioRef = useRef(null);
  const bosqueAudioRef = useRef(null);
  const endApneaAudioRef = useRef(null);
  const septasyncAudioRef = useRef(null);
  const replaceInputRef = useRef(null);
  const intervalRef = useRef(null);
  const breathStopTimerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const hiddenAtRef = useRef(null);
  const endHoldTimeoutRef = useRef(null);
  const endHoldIntervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const sessionStartRef = useRef(null);
  const lastTapRef = useRef(0);
  const lastApneaMsRef = useRef(0);

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
    const loadStudents = async () => {
      try {
        const response = await fetch("/api/students");
        if (!response.ok) {
          throw new Error("No se pudo cargar students");
        }
        const data = await response.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (error) {
        try {
          const fallback = await fetch("/students.json");
          if (!fallback.ok) throw new Error("Fallback fallido");
          const data = await fallback.json();
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

  const studentsWithSlugs = useMemo(() => withGeneratedSlugs(students), [students]);

  const student = useMemo(() => {
    if (!slug) return null;
    return studentsWithSlugs.find((item) => item.slug === slug) || null;
  }, [slug, studentsWithSlugs]);

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
    audioRef.current.volume = Math.min(1, Math.max(0, config.audioVolume));
  }, [config.audioVolume]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    bosqueAudioRef.current.volume = Math.min(1, Math.max(0, config.bosqueVolume));
  }, [config.bosqueVolume]);

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
  }, [config.ambientSound, config.septasyncTrack, fetchAudioUrl]);

  useEffect(() => {
    loadSystemAudio();
  }, [loadSystemAudio]);

  useEffect(() => {
    if (!bosqueAudioRef.current) return;
    if (!selectedAmbientUrl) {
      stopBosque();
      return;
    }
    if (bosqueAudioRef.current.src !== selectedAmbientUrl) {
      bosqueAudioRef.current.src = selectedAmbientUrl;
    }
  }, [selectedAmbientUrl]);

  useEffect(() => {
    if (!isRunning || isPaused) {
      stopBosque();
      return;
    }
    playBosque();
  }, [phase, isRunning, isPaused, selectedAmbientUrl]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) {
      stopSeptasync();
      return;
    }
    if (septasyncAudioRef.current.src !== selectedSeptasyncUrl) {
      septasyncAudioRef.current.src = selectedSeptasyncUrl;
    }
  }, [selectedSeptasyncUrl]);

  useEffect(() => {
    if (!septasyncAudioRef.current) return;
    septasyncAudioRef.current.volume = Math.min(1, Math.max(0, config.septasyncVolume));
  }, [config.septasyncVolume]);

  useEffect(() => {
    if (!isRunning || isPaused) {
      stopSeptasync();
      return;
    }
    playSeptasync();
  }, [isRunning, isPaused, selectedSeptasyncUrl]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    intervalRef.current = setInterval(() => {
      if (phase === "apnea") {
        setTimeLeftMs((prev) => prev + TICK_MS);
        return;
      }
      setTimeLeftMs((prev) => {
        const next = prev - TICK_MS;
        if (next > 0) return next;
        handlePhaseAdvance();
        return 0;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, phase, subphase, breathsDone, cycleIndex, config]);

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
      if (document.visibilityState === "hidden") {
        if (isRunningRef.current && !isPausedRef.current) {
          hiddenAtRef.current = Date.now();
        }
        return;
      }

      if (isRunningRef.current && !isPausedRef.current) {
        requestWakeLock();
      }

      if (!hiddenAtRef.current) return;
      const elapsed = Date.now() - hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (elapsed <= 0) return;

      if (phaseRef.current === "apnea") {
        setTimeLeftMs((prev) => prev + elapsed);
        return;
      }

      setTimeLeftMs((prev) => {
        const next = prev - elapsed;
        if (next > 0) return next;
        handlePhaseAdvance();
        return 0;
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => () => {
    cancelEndApneaHold();
    releaseWakeLock();
  }, []);

  const handlePhaseAdvance = () => {
    if (phase === "breathing") {
      if (subphase === "inhale") {
        setSubphase("exhale");
        setTimeLeftMs(config.exhaleSeconds * 1000);
        return;
      }

      const nextBreaths = breathsDone + 1;
      if (nextBreaths >= config.breathsPerCycle) {
        setBreathsDone(nextBreaths);
        startApnea();
        return;
      }

      setBreathsDone(nextBreaths);
      setSubphase("inhale");
      setCurrentBreathNumber(nextBreaths + 1);
      playBreathSound((config.inhaleSeconds + config.exhaleSeconds) * 1000);
      setTimeLeftMs(config.inhaleSeconds * 1000);
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
        playBreathSound((config.inhaleSeconds + config.exhaleSeconds) * 1000);
        setPhase("breathing");
        setTimeLeftMs(config.inhaleSeconds * 1000);
        return;
      }

      finishSession();
    }
  };

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

  const runAudioCheck = async () => {
    setAudioCheckStatus("checking");
    setAudioCheckMessage("Chequeando audios...");
    await loadSystemAudio();
    const apneaUrl = await loadSignedAudio();
    const checks = [];
    if (apneaUrl && audioRef.current) checks.push(waitForAudioReady(audioRef.current));
    if (breathAudioRef.current?.src) checks.push(waitForAudioReady(breathAudioRef.current));
    if (endApneaAudioRef.current?.src) checks.push(waitForAudioReady(endApneaAudioRef.current));
    if (selectedAmbientUrl && bosqueAudioRef.current?.src) checks.push(waitForAudioReady(bosqueAudioRef.current));
    if (selectedSeptasyncUrl && septasyncAudioRef.current?.src) checks.push(waitForAudioReady(septasyncAudioRef.current));

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
      }
      return true;
    }

    setAudioCheckStatus("warning");
    setAudioCheckMessage(`Audio parcial (${okCount}/${results.length}), inicio permitido`);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
    }
    return true;
  };

  const startSession = async () => {
    if (!student) return;
    await runAudioCheck();
    sessionStartRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
    setPhase("breathing");
    setCycleIndex(1);
    setBreathsDone(0);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    playBreathSound((config.inhaleSeconds + config.exhaleSeconds) * 1000);
    unlockApneaAudio();
    setTimeLeftMs(config.inhaleSeconds * 1000);
  };

  const pauseSession = () => {
    setIsPaused(true);
    pauseAudio();
  };

  const resumeSession = () => {
    setIsPaused(false);
    if (phase === "apnea") playAudio();
    if (phase === "breathing") playBosque();
  };

  const stopSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setCurrentBreathNumber(1);
    setSubphase("inhale");
    stopAudio();
    stopBosque();
    stopSeptasync();
    stopBreathSound();
  };

  const startApnea = () => {
    setPhase("apnea");
    setTimeLeftMs(0);
    loadSignedAudio().then((url) => {
      if (url) playAudio();
    });
  };

  const startRecovery = () => {
    if (phase === "apnea") {
      lastApneaMsRef.current = timeLeftMs;
      playEndApnea();
    }
    setPhase("recovery");
    setTimeLeftMs(config.recoverySeconds * 1000);
    stopAudio();
    stopSeptasync();
  };

  const finishSession = () => {
    setPhase("complete");
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeftMs(0);
    stopAudio();

    const today = getTodayKey();
    const yesterday = getYesterdayKey();
    const addedBreaths = config.breathsPerCycle * config.cycles;

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
    audioRef.current.currentTime = 0;
    audioRef.current.loop = true;
    audioRef.current.play().catch(() => {
      // Autoplay might be blocked until user gesture
    });
  };

  const unlockApneaAudio = () => {
    if (!audioRef.current) return;
    const el = audioRef.current;
    const prevMuted = el.muted;
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = prevMuted;
      })
      .catch(() => {
        el.muted = prevMuted;
      });
  };

  const playBreathSound = (durationMs) => {
    if (!breathAudioRef.current) return;
    if (breathStopTimerRef.current) {
      clearTimeout(breathStopTimerRef.current);
      breathStopTimerRef.current = null;
    }
    breathAudioRef.current.currentTime = 0;
    breathAudioRef.current.loop = false;
    breathAudioRef.current.play().catch(() => {});
    const totalMs = Number.isFinite(durationMs)
      ? durationMs
      : (config.inhaleSeconds + config.exhaleSeconds) * 1000;
    breathStopTimerRef.current = setTimeout(() => {
      stopBreathSound();
    }, Math.max(0, totalMs));
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
    if (bosqueAudioRef.current.src !== selectedAmbientUrl) {
      bosqueAudioRef.current.src = selectedAmbientUrl;
    }
    bosqueAudioRef.current.loop = true;
    bosqueAudioRef.current.play().catch(() => {});
  };

  const stopBosque = () => {
    if (!bosqueAudioRef.current) return;
    bosqueAudioRef.current.pause();
    bosqueAudioRef.current.currentTime = 0;
  };

  const playSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    if (!selectedSeptasyncUrl) return;
    if (septasyncAudioRef.current.src !== selectedSeptasyncUrl) {
      septasyncAudioRef.current.src = selectedSeptasyncUrl;
    }
    septasyncAudioRef.current.loop = true;
    septasyncAudioRef.current.play().catch(() => {});
  };

  const stopSeptasync = () => {
    if (!septasyncAudioRef.current) return;
    septasyncAudioRef.current.pause();
    septasyncAudioRef.current.currentTime = 0;
  };

  const playEndApnea = () => {
    if (!endApneaAudioRef.current) return;
    endApneaAudioRef.current.currentTime = 0;
    endApneaAudioRef.current.loop = false;
    endApneaAudioRef.current.play().catch(() => {});
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
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
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

  const renderHeader = () => (
    <header className="header">
      <div>
        <p className="eyebrow">Respiración guiada</p>
        {!brandLogoMissing && (
          <img
            className="brand-logo"
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

  const handleDoubleTap = () => {
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

  const onPointerUp = (event) => {
    if (event.pointerType && event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      handleDoubleTap();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const isAdminRoute = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) return;
    if (adminPassword) {
      ensureAdminList(adminPassword);
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

  const handleAdminLogin = async () => {
    if (!adminPassword) return;
    sessionStorage.setItem("rmcortex_admin_pw", adminPassword);
    await ensureAdminList(adminPassword);
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

  const handleAdminCreate = async () => {
    if (!adminPassword || !adminName || !adminFile) {
      setAdminMessage("Completa nombre y audio.");
      return;
    }
    setAdminStatus("loading");
    setAdminMessage("");
    setAdminLink("");
    try {
      const audioBase64 = await readFileBase64(adminFile);
      const addRes = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          name: adminName,
          fileName: adminFile.name,
          contentType: adminFile.type || "audio/mpeg",
          audioBase64
        })
      });
      if (!addRes.ok) {
        const detail = await addRes.json().catch(() => ({}));
        throw new Error(`No se pudo crear estudiante (${detail?.error || "error"}).`);
      }
      const { student: created } = await addRes.json();
      const link = buildStudentLink(created.slug, created.token, true);
      setAdminLink(link);
      setAdminName("");
      setAdminFile(null);
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      setAdminMessage("Estudiante creado.");
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
      const audioBase64 = await readFileBase64(file);
      const updateRes = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          slug: replaceSlug,
          fileName: file.name,
          contentType: file.type || "audio/mpeg",
          audioBase64
        })
      });
      if (!updateRes.ok) {
        const detail = await updateRes.json().catch(() => ({}));
        throw new Error(detail?.error || "No se pudo actualizar");
      }
      await ensureAdminList(adminPassword);
      setAdminStatus("ready");
      setAdminMessage("Audio reemplazado.");
    } catch (error) {
      setAdminStatus("ready");
      setAdminMessage(error?.message || "No se pudo reemplazar el audio.");
    }
  };

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
              <h3>Estudiantes</h3>
              <div className="panel-actions">
                <input
                  type="search"
                  placeholder="Buscar estudiante…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <span className="muted">
                  {filteredAdminStudents.length} / {adminStudents.length}
                </span>
              </div>
              <div className="link-list">
                {filteredAdminStudents
                  .map((item) => (
                    <div key={item.slug} className="link-row">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted">{item.slug}</div>
                        {item.createdAt && (
                          <div className="muted">Creado: {new Date(item.createdAt).toLocaleDateString()}</div>
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
                          className="ghost"
                          onClick={() => handleAdminDelete(item.slug)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                {filteredAdminStudents.length === 0 && (
                  <p className="muted">
                    {adminStudents.length === 0
                      ? "Aún no hay estudiantes cargados."
                      : "Sin resultados para esa búsqueda."}
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

  return (
    <div className="app" onPointerUp={onPointerUp} onDoubleClick={handleDoubleTap}>
      {renderHeader()}

      <main className="grid">
        <section className="session card">
          <div className="session-header">
            <div>
              <p className="eyebrow">{PHASE_LABELS[phase]}</p>
              <h2>{phase === "complete" ? "Buen trabajo" : "Sesión en curso"}</h2>
            </div>
            <div className="timer">
              {phase === "idle" || phase === "complete" ? "--:--" : formatSeconds(timeLeftMs)}
            </div>
          </div>

          <div className="breath-visual">
            <div className={`breath-orb ${phaseClass()}`} style={phaseStyle()}>
              {!breathLogoMissing && (
                <img
                  className="breath-logo"
                  src="/logo-05.png"
                  alt="Cortex breath"
                  onError={() => setBreathLogoMissing(true)}
                />
              )}
              {breathLogoMissing && <div className="breath-logo-fallback">Falta /public/logo-05.png</div>}
              {phase === "breathing" && (
                <div
                  key={`pulse-${cycleIndex}-${breathsDone}`}
                  className="breath-count"
                  style={{ animationDuration: `${config.inhaleSeconds + config.exhaleSeconds}s` }}
                >
                  {currentBreathNumber}
                </div>
              )}
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
                disabled={audioCheckStatus === "checking"}
              >
                {audioCheckStatus === "checking" ? "Chequeando audio..." : "Iniciar sesión"}
              </button>
            )}
            {isRunning && !isPaused && (
              <button className="secondary" onClick={pauseSession}>Pausar</button>
            )}
            {isRunning && isPaused && (
              <button className="secondary" onClick={resumeSession}>Reanudar</button>
            )}
            {isRunning && (
              <button className="ghost" onClick={stopSession}>Detener</button>
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
          </div>

          <audio ref={audioRef} src={audioSrc} preload="auto" />
          <audio ref={breathAudioRef} preload="auto" />
          <audio ref={bosqueAudioRef} preload="auto" />
          <audio ref={endApneaAudioRef} preload="auto" />
          <audio ref={septasyncAudioRef} preload="auto" />
        </section>

        <section className="card">
          <h3>Configuración rápida</h3>
          <p className="muted">Presets rápidos para no tocar sliders en cada sesión.</p>

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
