import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Headphones,
  LayoutDashboard,
  Link2,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  UserRound,
  UserPlus,
  UsersRound,
  X
} from "lucide-react";
import "./admin2.css";

const NAV_ITEMS = [
  { id: "followup", label: "Seguimiento", Icon: LayoutDashboard },
  { id: "students", label: "Alumnos", Icon: UsersRound },
  { id: "alerts", label: "Alertas", Icon: AlertTriangle },
  { id: "audio", label: "Audios", Icon: Headphones }
];

const hasRecordedAudio = (student) => Boolean(
  student?.audioKey ||
    student?.audioWorkflow?.rawAudioKey ||
    student?.audioWorkflow?.hasRawAudio ||
    student?.audioWorkflow?.rawUploadedAt ||
    student?.audioWorkflow?.submittedAt ||
    student?.audioWorkflow?.editorAudioKey ||
    student?.audioWorkflow?.hasEditedAudio
);

const hasBeginnerAudio = (student) => Boolean(
  student?.audioKey ||
    student?.audioWorkflow?.beginnerAudioKey ||
    student?.audioWorkflow?.hasBeginnerAudio
);

const getAudioGroup = (student) => {
  if (hasBeginnerAudio(student)) return "ready";
  if (hasRecordedAudio(student)) return "processing";
  return "pending";
};

const getAudioLabel = (student) => {
  const group = getAudioGroup(student);
  if (group === "ready") return "Principiante listo";
  if (group === "processing") return "Procesando";
  return "Falta grabar";
};

const getAccessMeta = (student) => {
  if (!student?.email) return { label: "Falta email", tone: "warning" };
  if (!student?.auth?.hasPassword) return { label: "Crear contraseña", tone: "warning" };
  return { label: "Acceso activo", tone: "ok" };
};

const getRiskMeta = (student) => {
  if (student?.status === "inactive") {
    return { id: "inactive", label: "Inactivo", detail: "Fuera del seguimiento", tone: "neutral" };
  }
  const misses = Number(student?.weeklyPractice?.consecutiveMisses || 0);
  if (student?.alertLevel === "critical" || misses >= 2) {
    const inactiveHours = Number(student?.inactiveHours);
    const inactiveDays = Number.isFinite(inactiveHours) ? Math.floor(inactiveHours / 24) : 0;
    const days = Math.max(misses, inactiveDays);
    return {
      id: "critical",
      label: days > 1 ? `${days} días sin práctica` : "Atención hoy",
      detail: "Contactar hoy",
      tone: "critical"
    };
  }
  if (student?.alertLevel === "warning" || misses === 1) {
    return { id: "warning", label: "48 h sin práctica", detail: "Dar seguimiento", tone: "warning" };
  }
  return { id: "ok", label: "Al día", detail: "Sin acción urgente", tone: "ok" };
};

const getPriorityScore = (student) => {
  const risk = getRiskMeta(student);
  const riskScore = risk.id === "critical" ? 1000 : risk.id === "warning" ? 500 : risk.id === "ok" ? 100 : 0;
  const misses = Number(student?.weeklyPractice?.consecutiveMisses || 0) * 20;
  const audioScore = getAudioGroup(student) === "pending" ? 12 : 0;
  const inactiveHours = Number(student?.inactiveHours);
  return riskScore + misses + audioScore + (Number.isFinite(inactiveHours) ? Math.min(100, inactiveHours) : 0);
};

const getTimestamp = (value) => {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatRelativeActivity = (value) => {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "Sin actividad";
  const days = Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
};

const formatDateTime = (value) => {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "Sin actividad registrada";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(time));
};

const getNextAction = (student) => {
  const risk = getRiskMeta(student);
  const audioGroup = getAudioGroup(student);
  if (risk.id === "critical") return "Contactar hoy";
  if (audioGroup === "pending") return "Resolver audio";
  if (risk.id === "warning") return "Dar seguimiento";
  if (!student?.flowState?.onboarding) return "Revisar onboarding";
  return "Seguimiento normal";
};

const matchesSearch = (student, query) => {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [student?.name, student?.slug, student?.email, student?.phone]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
};

function MetricButton({ icon: Icon, label, value, detail, tone = "neutral", onClick, active }) {
  return (
    <button
      type="button"
      className={`admin2-metric ${tone} ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="admin2-metric-icon"><Icon size={18} strokeWidth={2} /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </button>
  );
}

function StatusBadge({ tone, children }) {
  return <span className={`admin2-status ${tone}`}>{children}</span>;
}

function NewStudentModal({ onClose, onCreate, onOpenStudent }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestAudio, setRequestAudio] = useState(true);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && status !== "loading") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, status]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setCopied(false);
    try {
      const created = await onCreate({ name, email, requestAudio });
      setResult(created);
      setStatus("success");
    } catch (creationError) {
      setError(creationError?.message || "No se pudo crear el alumno.");
      setStatus("error");
    }
  };

  const copyResultLink = async () => {
    const link = result?.uploadLink || result?.accessLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (_error) {
      window.prompt("Copiá este enlace:", link);
    }
  };

  return (
    <div className="admin2-modal-layer">
      <button type="button" className="admin2-modal-backdrop" aria-label="Cerrar alta manual" onClick={status === "loading" ? undefined : onClose} />
      <section className="admin2-modal" role="dialog" aria-modal="true" aria-labelledby="admin2-new-student-title">
        <header className="admin2-modal-header">
          <div>
            <span className="admin2-eyebrow">Alta manual</span>
            <h2 id="admin2-new-student-title">Nuevo alumno</h2>
          </div>
          <button type="button" className="admin2-icon-button" aria-label="Cerrar alta manual" onClick={onClose} disabled={status === "loading"}>
            <X size={20} />
          </button>
        </header>

        {result ? (
          <div className="admin2-create-result">
            <CheckCircle2 size={34} />
            <div>
              <h3>{result.existing ? "Alumno encontrado" : "Alumno creado"}</h3>
              <p>
                {result.existing
                  ? "El email ya estaba registrado. Se reutilizó la ficha existente y no se creó un duplicado."
                  : "La ficha quedó lista en RM."}
              </p>
              <strong>{result.student.name}</strong>
              <span>{result.student.email}</span>
            </div>
            <div className="admin2-modal-actions">
              <button type="button" className="admin2-button primary" onClick={copyResultLink}>
                <Link2 size={17} /> {copied ? "Enlace copiado" : result.uploadLink ? "Copiar enlace de audio" : "Copiar acceso"}
              </button>
              <button type="button" className="admin2-button secondary" onClick={() => onOpenStudent(result.student.slug)}>
                Ver ficha
              </button>
            </div>
          </div>
        ) : (
          <form className="admin2-create-form" onSubmit={submit}>
            <p>Creá la ficha y obtené el enlace que se le envía al alumno para grabar su audio.</p>
            <label>
              Nombre completo
              <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Alma Rosa Macias" />
            </label>
            <label>
              Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alumno@email.com" />
            </label>
            <label className="admin2-checkbox-row">
              <input type="checkbox" checked={requestAudio} onChange={(event) => setRequestAudio(event.target.checked)} />
              <span><strong>Solicitar audio ahora</strong><small>Genera el enlace de grabación al crear la ficha.</small></span>
            </label>
            {error && <p className="admin2-form-error" role="alert">{error}</p>}
            <div className="admin2-modal-actions">
              <button type="button" className="admin2-button secondary" onClick={onClose} disabled={status === "loading"}>Cancelar</button>
              <button type="submit" className="admin2-button primary" disabled={status === "loading" || !name.trim() || !email.trim()}>
                <UserPlus size={17} /> {status === "loading" ? "Creando..." : "Crear alumno"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function StudentDrawer({
  student,
  onClose,
  onCopyLink,
  onRequestAudio,
  onReplaceAudio,
  onToggleStudentStatus,
  onToggleColor,
  canRequestAudio,
  studentUrl,
  formatDuration,
  getAdvancedInfo
}) {
  useEffect(() => {
    if (!student) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [student, onClose]);

  if (!student) return null;

  const risk = getRiskMeta(student);
  const weekly = student.weeklyPractice || {};
  const beginner = student.beginnerAudioProgress || {};
  const apneaDays = Array.isArray(student.apneaDailyLog) ? student.apneaDailyLog.slice(0, 4) : [];
  const active = student.status !== "inactive";
  const advancedInfo = getAdvancedInfo(student);
  const access = getAccessMeta(student);
  const accessActionLabel = !student.email
    ? "Copiar link anterior"
    : student.auth?.hasPassword
      ? "Copiar credenciales"
      : "Crear contraseña";
  const initial = String(student.name || student.slug || "A").trim().slice(0, 1).toUpperCase();

  return (
    <div className="admin2-drawer-layer">
      <button type="button" className="admin2-drawer-backdrop" aria-label="Cerrar ficha" onClick={onClose} />
      <aside className="admin2-drawer" role="dialog" aria-modal="true" aria-label={`Ficha de ${student.name}`}>
        <header className="admin2-drawer-header">
          <div className="admin2-student-avatar large">{initial}</div>
          <div>
            <span className="admin2-eyebrow">Ficha de seguimiento</span>
            <h2>{student.name}</h2>
            <p>{student.email || student.slug}</p>
          </div>
          <button type="button" className="admin2-icon-button" title="Cerrar" aria-label="Cerrar ficha" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="admin2-drawer-summary">
          <StatusBadge tone={risk.tone}>{risk.label}</StatusBadge>
          <StatusBadge tone={getAudioGroup(student)}>{getAudioLabel(student)}</StatusBadge>
          <StatusBadge tone={access.tone}>{access.label}</StatusBadge>
          <StatusBadge tone={active ? "ok" : "neutral"}>{active ? "Activo" : "Inactivo"}</StatusBadge>
        </div>

        <section className="admin2-drawer-band">
          <div className="admin2-band-heading">
            <div>
              <span className="admin2-eyebrow">Próxima acción</span>
              <h3>{getNextAction(student)}</h3>
            </div>
            <Clock3 size={20} />
          </div>
          <p>Última actividad: <strong>{formatDateTime(student.lastActivityAt)}</strong></p>
        </section>

        <section className="admin2-drawer-grid" aria-label="Resumen del alumno">
          <div><span>Semana</span><strong>{weekly.practicedDays || 0}/{weekly.expectedDays || 7}</strong></div>
          <div><span>Racha</span><strong>{weekly.currentStreak || 0} días</strong></div>
          <div><span>Principiante</span><strong>{beginner.completedDays || 0}/{beginner.requiredDays || 7}</strong></div>
          <div><span>Mejor apnea</span><strong>{formatDuration(student.apneaBestSeconds || 0)}</strong></div>
        </section>

        <section className="admin2-drawer-section">
          <div className="admin2-section-title">
            <Activity size={18} />
            <h3>Progreso del programa</h3>
          </div>
          <div className="admin2-stage-list">
            <span className={student.flowState?.onboarding ? "done" : ""}><CheckCircle2 size={16} /> Onboarding</span>
            <span className={student.flowState?.prePractice ? "done" : ""}><CheckCircle2 size={16} /> Pre-práctica</span>
            <span className={student.flowState?.practice ? "done" : ""}><CheckCircle2 size={16} /> Práctica</span>
          </div>
        </section>

        <section className="admin2-drawer-section">
          <div className="admin2-section-title">
            <AudioLines size={18} />
            <h3>Audio y acceso</h3>
          </div>
          <dl className="admin2-detail-list">
            <div><dt>Grabación</dt><dd>{hasRecordedAudio(student) ? "Recibida" : "Falta grabar"}</dd></div>
            <div><dt>Principiante</dt><dd>{hasBeginnerAudio(student) ? "Listo" : "Pendiente"}</dd></div>
            <div><dt>Advanced</dt><dd>{advancedInfo.unlocked ? "Habilitado" : advancedInfo.advancedAudioReady ? `Listo · faltan ${advancedInfo.remainingDays} días` : "Pendiente"}</dd></div>
            <div><dt>Acceso</dt><dd>{access.label}</dd></div>
            <div><dt>Colores</dt><dd>{student.features?.colorVisionEnabled ? "Habilitada" : "Bloqueada"}</dd></div>
          </dl>
        </section>

        <section className="admin2-drawer-section">
          <div className="admin2-section-title">
            <Activity size={18} />
            <h3>Apneas recientes</h3>
          </div>
          {apneaDays.length ? (
            <div className="admin2-apnea-list">
              {apneaDays.map((day) => (
                <div key={day.dateKey || day.label}>
                  <span>{day.label}</span>
                  <strong>{(day.times || []).slice(0, 3).map(formatDuration).join(" · ")}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin2-empty-copy">Todavía no hay apneas registradas.</p>
          )}
        </section>

        <section className="admin2-drawer-actions" aria-label="Acciones del alumno">
          <button type="button" className="admin2-button primary" onClick={() => onCopyLink(student)}>
            <Copy size={17} /> {accessActionLabel}
          </button>
          <a className="admin2-button secondary" href={studentUrl(student)} target="_blank" rel="noreferrer">
            <ExternalLink size={17} /> Abrir app
          </a>
          {canRequestAudio(student) && (
            <button type="button" className="admin2-button secondary" onClick={() => onRequestAudio(student)}>
              <Headphones size={17} /> Solicitar audio
            </button>
          )}
          <button type="button" className="admin2-button secondary" onClick={() => onReplaceAudio(student)}>
            <AudioLines size={17} /> Reemplazar audio
          </button>
          <button type="button" className="admin2-button secondary" onClick={() => onToggleColor(student)}>
            {student.features?.colorVisionEnabled ? "Deshabilitar colores" : "Habilitar colores"}
          </button>
          <button type="button" className="admin2-button secondary" onClick={() => onToggleStudentStatus(student)}>
            {active ? "Marcar inactivo" : "Marcar activo"}
          </button>
        </section>
      </aside>
    </div>
  );
}

export default function Admin2Dashboard({
  status,
  loginCard,
  analytics,
  message,
  theme,
  onToggleTheme,
  onRefresh,
  onCreateStudent,
  onCopyLink,
  onRequestAudio,
  onReplaceAudio,
  onToggleStudentStatus,
  onToggleColor,
  canRequestAudio,
  studentUrl,
  formatDuration,
  getAdvancedInfo
}) {
  const [section, setSection] = useState("followup");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("attention");
  const [audioFilter, setAudioFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const allRows = analytics?.rows || [];
  const audioPendingCount = useMemo(
    () => allRows.filter((student) => student.status !== "inactive" && getAudioGroup(student) !== "ready").length,
    [allRows]
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [section, query, riskFilter, audioFilter, cohortFilter, sortBy]);

  const selectedStudent = useMemo(
    () => allRows.find((student) => student.slug === selectedSlug) || null,
    [allRows, selectedSlug]
  );

  const filteredRows = useMemo(() => {
    let rows = allRows.filter((student) => matchesSearch(student, query));

    if (section !== "students") rows = rows.filter((student) => student.status !== "inactive");
    if (section === "alerts") rows = rows.filter((student) => getRiskMeta(student).id === "critical" || getRiskMeta(student).id === "warning");
    if (section === "audio") rows = rows.filter((student) => getAudioGroup(student) !== "ready");

    if (riskFilter === "attention") rows = rows.filter((student) => ["critical", "warning"].includes(getRiskMeta(student).id));
    if (["critical", "warning", "ok", "inactive"].includes(riskFilter)) {
      rows = rows.filter((student) => getRiskMeta(student).id === riskFilter);
    }
    if (audioFilter !== "all") rows = rows.filter((student) => getAudioGroup(student) === audioFilter);
    if (cohortFilter !== "all") rows = rows.filter((student) => student.ageBucket === cohortFilter);

    return rows.sort((a, b) => {
      if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""), "es");
      if (sortBy === "recent") return getTimestamp(b.lastActivityAt) - getTimestamp(a.lastActivityAt);
      if (sortBy === "oldest") return Number(b.ageDays || 0) - Number(a.ageDays || 0);
      return getPriorityScore(b) - getPriorityScore(a);
    });
  }, [allRows, section, query, riskFilter, audioFilter, cohortFilter, sortBy]);

  const selectMetric = (nextSection, nextRisk, nextAudio = "all", nextSort = "priority") => {
    setSection(nextSection);
    setRiskFilter(nextRisk);
    setAudioFilter(nextAudio);
    setSortBy(nextSort);
    setNavOpen(false);
  };

  const switchSection = (nextSection) => {
    setSection(nextSection);
    setRiskFilter(nextSection === "followup" || nextSection === "alerts" ? "attention" : "all");
    setAudioFilter("all");
    setNavOpen(false);
  };

  if (status !== "ready") {
    return (
      <div className="admin2-login-page">
        <div className="admin2-login-brand">
          <img src={theme === "dark" ? "/logo-10-dark.png" : "/logo-10-light.png"} alt="Cortex" />
          <span>Seguimiento administrativo</span>
        </div>
        {loginCard}
      </div>
    );
  }

  return (
    <div className="admin2-shell">
      <aside className={`admin2-sidebar ${navOpen ? "is-open" : ""}`}>
        <div className="admin2-sidebar-brand">
          <img src={theme === "dark" ? "/logo-10-dark.png" : "/logo-10-light.png"} alt="Cortex" />
          <span>Administración</span>
          <button type="button" className="admin2-icon-button mobile-only" aria-label="Cerrar menú" onClick={() => setNavOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Navegación administrativa">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button type="button" key={id} className={section === id ? "active" : ""} onClick={() => switchSection(id)}>
              <Icon size={19} />
              <span>{label}</span>
              {id === "alerts" && analytics.critical.length > 0 && <em>{analytics.critical.length + analytics.warning.length}</em>}
              {id === "audio" && audioPendingCount > 0 && <em>{audioPendingCount}</em>}
            </button>
          ))}
        </nav>
        <div className="admin2-sidebar-footer">
          <a href="/admin-classic"><Settings size={18} /> Admin clásico</a>
          <span>Panel operativo</span>
        </div>
      </aside>

      {navOpen && <button type="button" className="admin2-nav-backdrop" aria-label="Cerrar menú" onClick={() => setNavOpen(false)} />}

      <main className="admin2-main">
        <header className="admin2-topbar">
          <button type="button" className="admin2-icon-button mobile-only" aria-label="Abrir menú" onClick={() => setNavOpen(true)}>
            <Menu size={21} />
          </button>
          <div>
            <span className="admin2-eyebrow">Operación diaria</span>
            <h1>{NAV_ITEMS.find((item) => item.id === section)?.label || "Seguimiento"}</h1>
          </div>
          <div className="admin2-topbar-actions">
            <button type="button" className="admin2-button primary admin2-new-student-button" onClick={() => setNewStudentOpen(true)}>
              <UserPlus size={17} /> <span>Nuevo alumno</span>
            </button>
            <button type="button" className="admin2-icon-button" title="Actualizar datos" aria-label="Actualizar datos" onClick={onRefresh}>
              <RefreshCw size={19} />
            </button>
            <button type="button" className="admin2-icon-button" title={theme === "dark" ? "Modo claro" : "Modo oscuro"} aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="admin2-admin-chip"><UserRound size={17} /><span>Administración</span></div>
          </div>
        </header>

        {message && <div className="admin2-feedback" role="status">{message}</div>}

        <section className="admin2-metrics" aria-label="Indicadores de seguimiento">
          <MetricButton
            icon={AlertTriangle}
            label="Contactar hoy"
            value={analytics.critical.length}
            detail="Prioridad alta"
            tone="critical"
            active={section === "alerts" && riskFilter === "critical"}
            onClick={() => selectMetric("alerts", "critical")}
          />
          <MetricButton
            icon={Clock3}
            label="Seguimiento 48 h"
            value={analytics.warning.length}
            detail="Revisar durante el día"
            tone="warning"
            active={section === "alerts" && riskFilter === "warning"}
            onClick={() => selectMetric("alerts", "warning")}
          />
          <MetricButton
            icon={Headphones}
            label="Audio pendiente"
            value={audioPendingCount}
            detail="Sin audio listo"
            tone="audio"
            active={section === "audio"}
            onClick={() => selectMetric("audio", "all", "all")}
          />
          <MetricButton
            icon={Activity}
            label="Practicaron hoy"
            value={analytics.practicingDaily.length}
            detail={`${analytics.active.length} alumnos activos`}
            tone="ok"
            active={section === "students" && sortBy === "recent"}
            onClick={() => selectMetric("students", "all", "all", "recent")}
          />
        </section>

        <section className="admin2-workspace" aria-label="Alumnos">
          <div className="admin2-toolbar">
            <label className="admin2-search">
              <Search size={18} />
              <input type="search" placeholder="Buscar por nombre, email o teléfono" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button type="button" className={`admin2-button secondary ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((current) => !current)}>
              <Filter size={17} /> Filtros
            </button>
            <select aria-label="Ordenar alumnos" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="priority">Prioridad</option>
              <option value="recent">Actividad reciente</option>
              <option value="oldest">Mayor antigüedad</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>

          {filtersOpen && (
            <div className="admin2-filter-panel">
              <label>Riesgo
                <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="attention">Requieren atención</option>
                  <option value="critical">Contactar hoy</option>
                  <option value="warning">Seguimiento 48 h</option>
                  <option value="ok">Al día</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
              <label>Audio
                <select value={audioFilter} onChange={(event) => setAudioFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="processing">Recibido/procesando</option>
                  <option value="ready">Listo</option>
                </select>
              </label>
              <label>Antigüedad
                <select value={cohortFilter} onChange={(event) => setCohortFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  <option value="age-30">Día 0-30</option>
                  <option value="age-60">Día 31-60</option>
                  <option value="age-90">Día 61-90</option>
                  <option value="age-90plus">Más de 90 días</option>
                </select>
              </label>
              <button type="button" className="admin2-button tertiary" onClick={() => {
                setRiskFilter("all");
                setAudioFilter("all");
                setCohortFilter("all");
              }}>Limpiar filtros</button>
            </div>
          )}

          <div className="admin2-list-head">
            <div>
              <strong>{filteredRows.length} alumnos</strong>
              <span>Ordenados para trabajar de arriba hacia abajo</span>
            </div>
          </div>

          <div className="admin2-table-wrap">
            <table className="admin2-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Trayecto</th>
                  <th>Última práctica</th>
                  <th>Semana</th>
                  <th>Audio</th>
                  <th>Riesgo</th>
                  <th><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, visibleCount).map((student) => {
                  const weekly = student.weeklyPractice || {};
                  const expectedDays = weekly.expectedDays || 7;
                  const practicedDays = weekly.practicedDays || 0;
                  const weekPct = Math.min(100, Math.round((practicedDays / expectedDays) * 100));
                  const risk = getRiskMeta(student);
                  const initial = String(student.name || student.slug || "A").trim().slice(0, 1).toUpperCase();
                  return (
                    <tr key={student.slug} className={`risk-${risk.tone}`}>
                      <td data-label="Alumno">
                        <button type="button" className="admin2-student-cell" onClick={() => setSelectedSlug(student.slug)}>
                          <span className="admin2-student-avatar">{initial}</span>
                          <span><strong>{student.name}</strong><small>{student.email || student.slug}</small></span>
                        </button>
                      </td>
                      <td data-label="Trayecto">
                        <strong>Día {Number.isFinite(student.ageDays) ? student.ageDays : "-"}</strong>
                        <small>{student.flowState?.practice ? "Práctica" : student.flowState?.prePractice ? "Pre-práctica" : student.flowState?.onboarding ? "Onboarding" : "Sin iniciar"}</small>
                      </td>
                      <td data-label="Última práctica">
                        <strong>{formatRelativeActivity(student.lastActivityAt)}</strong>
                        <small>{getNextAction(student)}</small>
                      </td>
                      <td data-label="Semana">
                        <div className="admin2-week-cell"><strong>{practicedDays}/{expectedDays}</strong><span><i style={{ width: `${weekPct}%` }} /></span></div>
                      </td>
                      <td data-label="Audio"><StatusBadge tone={getAudioGroup(student)}>{getAudioLabel(student)}</StatusBadge></td>
                      <td data-label="Riesgo"><StatusBadge tone={risk.tone}>{risk.label}</StatusBadge></td>
                      <td>
                        <button type="button" className="admin2-icon-button" title={`Abrir ficha de ${student.name}`} aria-label={`Abrir ficha de ${student.name}`} onClick={() => setSelectedSlug(student.slug)}>
                          <ChevronRight size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 && (
            <div className="admin2-empty"><CheckCircle2 size={28} /><strong>No hay alumnos para estos filtros.</strong><span>Probá cambiando la vista o limpiando los filtros.</span></div>
          )}
          {visibleCount < filteredRows.length && (
            <button type="button" className="admin2-button tertiary admin2-load-more" onClick={() => setVisibleCount((count) => count + 30)}>
              Mostrar 30 más
            </button>
          )}
        </section>
      </main>

      <StudentDrawer
        student={selectedStudent}
        onClose={() => setSelectedSlug("")}
        onCopyLink={onCopyLink}
        onRequestAudio={onRequestAudio}
        onReplaceAudio={onReplaceAudio}
        onToggleStudentStatus={onToggleStudentStatus}
        onToggleColor={onToggleColor}
        canRequestAudio={canRequestAudio}
        studentUrl={studentUrl}
        formatDuration={formatDuration}
        getAdvancedInfo={getAdvancedInfo}
      />
      {newStudentOpen && (
        <NewStudentModal
          onClose={() => setNewStudentOpen(false)}
          onCreate={onCreateStudent}
          onOpenStudent={(studentSlug) => {
            setNewStudentOpen(false);
            setSection("students");
            setRiskFilter("all");
            setAudioFilter("all");
            setSelectedSlug(studentSlug);
          }}
        />
      )}
    </div>
  );
}
