import {
  Activity,
  BarChart3,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  Home,
  LockKeyhole,
  Moon,
  Play,
  Sun,
  Target,
  TimerReset,
  Waves
} from "lucide-react";
import "./student-experience.css";

const NAV_ITEMS = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "practice", label: "Práctica", icon: Activity },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "help", label: "Ayuda", icon: CircleHelp }
];

const CORE_PRACTICE_IDS = new Set(["principiante", "reprogramacion", "metas"]);

function firstName(name) {
  const normalized = String(name || "").trim();
  return normalized ? normalized.split(/\s+/)[0] : "";
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <header className="student-experience-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {subtitle && <span>{subtitle}</span>}
    </header>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`student-experience-nav-button${active ? " active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

function AdvancedAction({ advancedUnlocked, advancedStatus, cycles, onOpenAdvanced, compact = false }) {
  return (
    <button
      type="button"
      className={`student-experience-advanced-action${compact ? " compact" : ""}${advancedUnlocked ? "" : " locked"}`}
      onClick={onOpenAdvanced}
    >
      <div>
        <span className="student-experience-kicker">Práctica de hoy</span>
        <strong>Advanced</strong>
        <small>
          {advancedUnlocked
            ? `Configuración actual · ${cycles} ${cycles === 1 ? "ciclo" : "ciclos"}`
            : advancedStatus}
        </small>
      </div>
      <span className="student-experience-round-action">
        {advancedUnlocked ? <Play size={21} fill="currentColor" /> : <LockKeyhole size={20} />}
      </span>
    </button>
  );
}

function BeginnerAction({ enabled, status, audioCount, onOpenBeginner }) {
  return (
    <button
      type="button"
      className={`student-experience-advanced-action${enabled ? "" : " locked"}`}
      onClick={enabled ? onOpenBeginner : undefined}
      disabled={!enabled}
    >
      <div>
        <span className="student-experience-kicker">Práctica de hoy</span>
        <strong>Principiante</strong>
        <small>
          {enabled
            ? `${audioCount} ${audioCount === 1 ? "audio disponible" : "audios disponibles"} · sin adelantar`
            : status}
        </small>
      </div>
      <span className="student-experience-round-action">
        {enabled ? <Play size={21} fill="currentColor" /> : <LockKeyhole size={20} />}
      </span>
    </button>
  );
}

function HomeScreen({
  studentName,
  beginnerEnabled,
  beginnerStatus,
  beginnerAudioCount,
  advancedUnlocked,
  advancedStatus,
  cycles,
  beginnerCompletedDays,
  beginnerRequiredDays,
  totalSessions,
  bestApneaLabel,
  currentStreak,
  onOpenAdvanced,
  onOpenBeginner,
  onOpenGoals,
  onNavigate
}) {
  return (
    <div className="student-experience-screen">
      <SectionHeading
        eyebrow="Academia Cortex"
        title={`Hola${firstName(studentName) ? `, ${firstName(studentName)}` : ""}`}
        subtitle={advancedUnlocked ? "Tu sesión Advanced está lista" : advancedStatus}
      />

      <section className="student-experience-home-grid" aria-label="Resumen de hoy">
        {advancedUnlocked ? (
          <AdvancedAction
            advancedUnlocked
            advancedStatus={advancedStatus}
            cycles={cycles}
            onOpenAdvanced={onOpenAdvanced}
          />
        ) : (
          <BeginnerAction
            enabled={beginnerEnabled}
            status={beginnerStatus}
            audioCount={beginnerAudioCount}
            onOpenBeginner={onOpenBeginner}
          />
        )}

        <button type="button" className="student-experience-summary-panel" onClick={onOpenGoals}>
          <span className="student-experience-summary-icon"><Target size={22} /></span>
          <div>
            <span className="student-experience-kicker">Metas diarias</span>
            <strong>Revisar metas y tareas</strong>
            <small>Tu plan de seguimiento de hoy</small>
          </div>
          <ChevronRight size={20} />
        </button>

        <button
          type="button"
          className="student-experience-summary-panel progress-panel"
          onClick={() => onNavigate("progress")}
        >
          <span className="student-experience-summary-icon amber"><BarChart3 size={22} /></span>
          <div>
            <span className="student-experience-kicker">Tu progreso</span>
            <strong>{currentStreak ? `${currentStreak} días de racha` : "Esta semana"}</strong>
            <small>{totalSessions} {totalSessions === 1 ? "sesión registrada" : "sesiones registradas"}</small>
          </div>
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="student-experience-metrics-band" aria-label="Métricas personales">
        <div><strong>{beginnerCompletedDays}/{beginnerRequiredDays}</strong><span>Principiante</span></div>
        <div><strong>{bestApneaLabel}</strong><span>Mejor apnea</span></div>
        <div><strong>{totalSessions}</strong><span>Sesiones</span></div>
      </section>
    </div>
  );
}

function PracticeEntry({ title, subtitle, enabled, status, icon: Icon, onClick, lockedAction = false }) {
  const actionable = enabled || lockedAction;
  return (
    <button
      type="button"
      className={`student-experience-practice-entry${enabled ? "" : " disabled"}`}
      onClick={actionable ? onClick : undefined}
      disabled={!actionable}
    >
      <span className="student-experience-choice-icon"><Icon size={19} /></span>
      <span>
        <strong>{title}</strong>
        <small>{enabled ? subtitle : status}</small>
      </span>
      {enabled ? <ChevronRight size={20} /> : <LockKeyhole size={18} />}
    </button>
  );
}

function PracticeScreen({
  practiceOptions,
  beginnerAudioCount,
  advancedUnlocked,
  advancedStatus,
  cycles,
  onOpenPractice,
  onOpenGoals
}) {
  const supplementalPractices = practiceOptions.filter((item) => !CORE_PRACTICE_IDS.has(item.id));

  return (
    <div className="student-experience-screen">
      <SectionHeading eyebrow="Práctica" title="Elegí tu práctica" subtitle="Continuá con el programa que tenés habilitado." />

      <section className="student-experience-practice-section">
        <div className="student-experience-section-label">
          <div><span>Primera etapa</span><strong>Principiante</strong></div>
          <Headphones size={22} />
        </div>
        <PracticeEntry
          title="Reprogramación Mental Principiante"
          subtitle={`${beginnerAudioCount} ${beginnerAudioCount === 1 ? "audio disponible" : "audios disponibles"} · sin adelantar`}
          enabled={practiceOptions.find((item) => item.id === "principiante")?.enabled}
          status={practiceOptions.find((item) => item.id === "principiante")?.status || "Pendiente de audio"}
          icon={Waves}
          onClick={() => onOpenPractice("principiante")}
        />
      </section>

      <section className="student-experience-practice-section">
        <div className="student-experience-section-label">
          <div><span>Respiración y apnea</span><strong>Advanced</strong></div>
          <Brain size={23} />
        </div>
        <AdvancedAction
          compact
          advancedUnlocked={advancedUnlocked}
          advancedStatus={advancedStatus}
          cycles={cycles}
          onOpenAdvanced={() => onOpenPractice("reprogramacion")}
        />
        <button type="button" className="student-experience-goals-link" onClick={onOpenGoals}>
          <span className="student-experience-choice-icon"><Target size={19} /></span>
          <span><strong>Metas diarias</strong><small>Revisar el plan y las tareas de hoy</small></span>
          <ChevronRight size={20} />
        </button>
      </section>

      {supplementalPractices.length > 0 && (
        <section className="student-experience-practice-section">
          <div className="student-experience-section-label">
            <div><span>Biblioteca</span><strong>Más prácticas</strong></div>
            <Activity size={22} />
          </div>
          <div className="student-experience-supplemental-grid">
            {supplementalPractices.map((item) => (
              <PracticeEntry
                key={item.id}
                title={item.label}
                subtitle="Disponible"
                enabled={item.enabled}
                status={item.status || "Bloqueado"}
                icon={Activity}
                onClick={() => onOpenPractice(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProgressScreen({
  weeklyActivity,
  beginnerCompletedDays,
  beginnerRequiredDays,
  weeklySessions,
  currentStreak,
  totalSessions,
  bestApneaLabel,
  lastApneaLabel,
  apneaDays,
  onOpenApneaHistory
}) {
  return (
    <div className="student-experience-screen">
      <SectionHeading eyebrow="Progreso" title="Tu evolución" subtitle="Prácticas y apneas registradas en tu cuenta." />
      <section className="student-experience-progress-layout">
        <article className="student-experience-data-panel">
          <div className="student-experience-section-label">
            <div><span>Principiante</span><strong>{beginnerCompletedDays} de {beginnerRequiredDays} días</strong></div>
            <Headphones size={21} />
          </div>
          <div className="student-experience-day-row" aria-label="Actividad de los últimos siete días">
            {weeklyActivity.map((day) => (
              <span key={day.key} className={day.done ? "done" : ""} title={day.label}>
                {day.done ? <Check size={15} /> : day.shortLabel}
              </span>
            ))}
          </div>
          <div className="student-experience-data-summary">
            <span><strong>{currentStreak}</strong>Racha</span>
            <span><strong>{weeklySessions}</strong>Esta semana</span>
            <span><strong>{totalSessions}</strong>Sesiones</span>
          </div>
        </article>

        <article className="student-experience-data-panel">
          <div className="student-experience-section-label">
            <div><span>Apneas</span><strong>Tiempos recientes</strong></div>
            <TimerReset size={21} />
          </div>
          <div className="student-experience-apnea-summary">
            <span><strong>{bestApneaLabel}</strong>Mejor</span>
            <span><strong>{lastApneaLabel}</strong>Última</span>
          </div>
          <div className="student-experience-apnea-days">
            {apneaDays.length > 0 ? apneaDays.slice(0, 4).map((day) => (
              <div key={day.dateKey}>
                <span><strong>{day.label}</strong><small>{day.total} {day.total === 1 ? "apnea" : "apneas"}</small></span>
                <span className="student-experience-apnea-times" aria-label={`Apneas de ${day.label}`}>
                  {(day.timeLabels || [day.bestLabel]).map((label, index) => (
                    <em key={`${day.dateKey}-${index}`}>A{index + 1} {label}</em>
                  ))}
                </span>
              </div>
            )) : <p>Sin apneas registradas todavía.</p>}
          </div>
          <button type="button" className="student-experience-history-button" onClick={onOpenApneaHistory}>
            <Clock3 size={17} /> Ver historial completo
          </button>
        </article>
      </section>
    </div>
  );
}

function HelpScreen() {
  return (
    <div className="student-experience-screen">
      <SectionHeading eyebrow="Ayuda" title="Tutorial de la app" subtitle="Guía oficial de Academia Cortex." />
      <section className="student-experience-video-panel">
        <video
          controls
          preload="metadata"
          poster="/cortex-tutorial-thumbnail.png"
          playsInline
        >
          <source src="/academia-cortex-tutorial.mp4" type="video/mp4" />
          <track
            kind="subtitles"
            src="/academia-cortex-tutorial-es.vtt"
            srcLang="es"
            label="Español"
            default
          />
          Tu navegador no puede reproducir este video.
        </video>
        <div>
          <span className="student-experience-kicker">Video tutorial</span>
          <strong>Academia Cortex</strong>
          <small>Duración: 3:27</small>
        </div>
      </section>
    </div>
  );
}

export default function StudentExperienceShell({
  studentName,
  activeTab,
  onTabChange,
  practiceOptions,
  beginnerAudioCount,
  beginnerCompletedDays,
  beginnerRequiredDays,
  advancedUnlocked,
  advancedStatus,
  advancedCycles,
  weeklyActivity,
  weeklySessions,
  currentStreak,
  totalSessions,
  bestApneaLabel,
  lastApneaLabel,
  apneaDays,
  onOpenPractice,
  onOpenGoals,
  onOpenApneaHistory,
  theme,
  onToggleTheme
}) {
  const navigate = (tab) => {
    onTabChange(tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const beginnerOption = practiceOptions.find((item) => item.id === "principiante");

  return (
    <div className="student-experience-shell">
      <aside className="student-experience-sidebar">
        <div className="student-experience-brand">
          <img src="/logo-05-light.png" alt="Academia Cortex" />
          <span>RM Web</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => navigate(item.id)} />
          ))}
        </nav>
        <button type="button" className="student-experience-theme-button" onClick={onToggleTheme}>
          <ThemeIcon size={18} />
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
      </aside>

      <header className="student-experience-mobile-header">
        <img src="/logo-05-light.png" alt="Academia Cortex" />
        <button type="button" onClick={onToggleTheme} aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
          <ThemeIcon size={20} />
        </button>
      </header>

      <main>
        {activeTab === "home" && (
          <HomeScreen
            studentName={studentName}
            beginnerEnabled={Boolean(beginnerOption?.enabled)}
            beginnerStatus={beginnerOption?.status || "Pendiente de audio"}
            beginnerAudioCount={beginnerAudioCount}
            advancedUnlocked={advancedUnlocked}
            advancedStatus={advancedStatus}
            cycles={advancedCycles}
            beginnerCompletedDays={beginnerCompletedDays}
            beginnerRequiredDays={beginnerRequiredDays}
            totalSessions={totalSessions}
            bestApneaLabel={bestApneaLabel}
            currentStreak={currentStreak}
            onOpenAdvanced={() => onOpenPractice("reprogramacion")}
            onOpenBeginner={() => onOpenPractice("principiante")}
            onOpenGoals={onOpenGoals}
            onNavigate={navigate}
          />
        )}
        {activeTab === "practice" && (
          <PracticeScreen
            practiceOptions={practiceOptions}
            beginnerAudioCount={beginnerAudioCount}
            advancedUnlocked={advancedUnlocked}
            advancedStatus={advancedStatus}
            cycles={advancedCycles}
            onOpenPractice={onOpenPractice}
            onOpenGoals={onOpenGoals}
          />
        )}
        {activeTab === "progress" && (
          <ProgressScreen
            weeklyActivity={weeklyActivity}
            beginnerCompletedDays={beginnerCompletedDays}
            beginnerRequiredDays={beginnerRequiredDays}
            weeklySessions={weeklySessions}
            currentStreak={currentStreak}
            totalSessions={totalSessions}
            bestApneaLabel={bestApneaLabel}
            lastApneaLabel={lastApneaLabel}
            apneaDays={apneaDays}
            onOpenApneaHistory={onOpenApneaHistory}
          />
        )}
        {activeTab === "help" && <HelpScreen />}
      </main>

      <nav className="student-experience-bottom-nav" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => (
          <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => navigate(item.id)} />
        ))}
      </nav>
    </div>
  );
}
