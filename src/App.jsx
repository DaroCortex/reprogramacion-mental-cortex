import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CONFIG = {
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  apneaSeconds: 60,
  recoverySeconds: 15,
  cycles: 3,
  audioVolume: 0.8
};

const PHASE_LABELS = {
  idle: "Listo para iniciar",
  breathing: "Respiración guiada",
  apnea: "Apnea",
  recovery: "Recuperación",
  complete: "Sesión completada"
};

const TICK_MS = 100;

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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [slug] = useState(getSlugFromLocation());
  const [token] = useState(getTokenFromLocation());
  const [searchTerm, setSearchTerm] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [audioSrc, setAudioSrc] = useState("");
  const [audioStatus, setAudioStatus] = useState("idle");

  const [phase, setPhase] = useState("idle");
  const [subphase, setSubphase] = useState("inhale");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [breathsDone, setBreathsDone] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [progress, setProgress] = useState({
    totalSessions: 0,
    totalBreaths: 0,
    streak: 0,
    lastSessionDate: "",
    lastSummary: null
  });

  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch("/students.json");
        if (!response.ok) {
          throw new Error("No se pudo cargar students.json");
        }
        const data = await response.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (error) {
        setLoadError("No se pudo cargar la lista de estudiantes.");
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

  useEffect(() => {
    if (!slug) return;
    const savedConfig = localStorage.getItem(`rmcortex_config_${slug}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({
          ...prev,
          ...parsed
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
    setAudioSrc("");
    setAudioStatus("idle");
  }, [student?.slug]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    intervalRef.current = setInterval(() => {
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
        setPhase("breathing");
        setTimeLeftMs(config.inhaleSeconds * 1000);
        return;
      }

      finishSession();
    }
  };

  const startSession = () => {
    if (!student) return;
    sessionStartRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
    setPhase("breathing");
    setCycleIndex(1);
    setBreathsDone(0);
    setSubphase("inhale");
    setTimeLeftMs(config.inhaleSeconds * 1000);
  };

  const pauseSession = () => {
    setIsPaused(true);
    pauseAudio();
  };

  const resumeSession = () => {
    setIsPaused(false);
    if (phase === "apnea") playAudio();
  };

  const stopSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPhase("idle");
    setTimeLeftMs(0);
    setBreathsDone(0);
    setCycleIndex(1);
    setSubphase("inhale");
    stopAudio();
  };

  const startApnea = () => {
    setPhase("apnea");
    setTimeLeftMs(config.apneaSeconds * 1000);
    loadSignedAudio().then((url) => {
      if (url) playAudio();
    });
  };

  const startRecovery = () => {
    setPhase("recovery");
    setTimeLeftMs(config.recoverySeconds * 1000);
    stopAudio();
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
        lastSummary: {
          date: today,
          cycles: config.cycles,
          breaths: addedBreaths
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

  const loadSignedAudio = async () => {
    if (!student?.slug || !student?.audioKey) return null;
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
    animationDuration: `${config.inhaleSeconds}s`
  };

  const exhaleStyle = {
    animationDuration: `${config.exhaleSeconds}s`
  };

  const phaseStyle = () => {
    if (phase === "breathing" && subphase === "inhale") return inhaleStyle;
    if (phase === "breathing" && subphase === "exhale") return exhaleStyle;
    return { animationDuration: "6s" };
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
        <h1>Reprogramación Mental / Cortex</h1>
      </div>
      <div className="student-chip">
        <span>Estudiante</span>
        <strong>{student?.name || "Sin asignación"}</strong>
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

  if (!slug) {
    return (
      <div className="app">
        {renderHeader()}
        <div className="card">
          <h2>Link único requerido</h2>
          <p>Abre la app con un link como:</p>
          <div className="code">https://tu-dominio.vercel.app/s/tu-slug</div>
          <p>También puedes usar <span className="code">?s=tu-slug</span>.</p>
          <p className="muted">El slug se genera automáticamente desde el nombre en <span className="code">public/students.json</span>.</p>
        </div>
        <div className="card">
          <h3>Panel de links</h3>
          <p className="muted">Copia el link único para cada estudiante.</p>
          <div className="panel-actions">
            <input
              type="search"
              placeholder="Buscar estudiante…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <a className="secondary link-button" href="/students-links.csv" download>
              Descargar CSV
            </a>
          </div>
          <div className="link-list">
            {studentsWithSlugs
              .filter((item) => {
                const term = searchTerm.trim().toLowerCase();
                if (!term) return true;
                return (
                  String(item.name || "").toLowerCase().includes(term) ||
                  String(item.slug || "").toLowerCase().includes(term) ||
                  String(item.audioKey || "").toLowerCase().includes(term)
                );
              })
              .map((item) => (
                <div key={item.slug} className="link-row">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="muted">{item.slug}</div>
                    {!item.audioKey && (
                      <div className="warn">Sin audioKey</div>
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
                  </div>
                </div>
              ))}
            {students.length === 0 && (
              <p className="muted">Aún no hay estudiantes cargados.</p>
            )}
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
    <div className="app">
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
            <div className={`breath-orb ${phaseClass()}`} style={phaseStyle()} />
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
              <strong>{student.audioKey ? "Asignado" : "No"}</strong>
            </div>
          </div>

          <div className="actions">
            {!isRunning && (
              <button className="primary" onClick={startSession}>Iniciar sesión</button>
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
              <button className="primary" onClick={endApneaEarly}>Terminar apnea</button>
            )}
          </div>

          <audio ref={audioRef} src={audioSrc} preload="auto" />
        </section>

        <section className="card">
          <h3>Configuración rápida</h3>
          <p className="muted">Puedes ajustar esto para todas las sesiones del estudiante.</p>
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
              Apnea (segundos)
              <input
                type="number"
                min="10"
                max="240"
                value={config.apneaSeconds}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    apneaSeconds: Number(event.target.value)
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
                max="6"
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
          <div className="audio-tools">
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
          </div>
          {progress.lastSummary && (
            <div className="summary">
              Última sesión: {progress.lastSummary.cycles} ciclos / {progress.lastSummary.breaths} respiraciones
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
