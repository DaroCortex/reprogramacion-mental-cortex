import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleHelp,
  Headphones,
  Home,
  Pause,
  Play,
  Settings2,
  Target,
  TimerReset,
  Waves
} from "lucide-react";
import "./ios-ux-preview.css";

const NAV_ITEMS = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "practice", label: "Práctica", icon: Activity },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "help", label: "Ayuda", icon: CircleHelp }
];

const INITIAL_GOALS = [
  { id: 1, title: "Respirar siempre por la nariz", meta: "Práctica · 12 pts", done: true },
  { id: 2, title: "Escuchar mi audio Septasync", meta: "Audio · 10 pts", done: true },
  { id: 3, title: "Definir el foco de mi sesión", meta: "Mentalidad · 8 pts", done: false },
  { id: 4, title: "Tomar una pausa consciente", meta: "Bienestar · 6 pts", done: false }
];

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`ios-preview-nav-button${active ? " active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <header className="ios-preview-section-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {subtitle && <span>{subtitle}</span>}
    </header>
  );
}

function HomeScreen({ onNavigate, completedGoals }) {
  return (
    <div className="ios-preview-screen">
      <SectionHeading
        eyebrow="Academia Cortex"
        title="Hola, Alex"
        subtitle="Tu sesión Advanced está lista"
      />

      <section className="ios-preview-home-grid" aria-label="Resumen de hoy">
        <button
          type="button"
          className="ios-preview-primary-panel"
          onClick={() => onNavigate("practice")}
        >
          <div>
            <span className="ios-preview-kicker">Práctica de hoy</span>
            <strong>Advanced</strong>
            <small>Automático · 5 ciclos</small>
          </div>
          <span className="ios-preview-round-action"><Play size={22} fill="currentColor" /></span>
        </button>

        <button
          type="button"
          className="ios-preview-summary-panel"
          onClick={() => onNavigate("goals")}
        >
          <span className="ios-preview-ring">{completedGoals}/4</span>
          <div>
            <span className="ios-preview-kicker">Metas diarias</span>
            <strong>{completedGoals} de 4 completadas</strong>
            <small>{completedGoals * 11} puntos de hoy</small>
          </div>
          <ChevronRight size={20} />
        </button>

        <button
          type="button"
          className="ios-preview-summary-panel progress-panel"
          onClick={() => onNavigate("progress")}
        >
          <CalendarDays size={26} />
          <div>
            <span className="ios-preview-kicker">Tu progreso</span>
            <strong>Esta semana</strong>
            <small>7 días de racha · 10 sesiones</small>
          </div>
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="ios-preview-metrics-band" aria-label="Métricas de la semana">
        <div><strong>7/7</strong><span>Principiante</span></div>
        <div><strong>2:04</strong><span>Mejor apnea</span></div>
        <div><strong>10</strong><span>Sesiones</span></div>
      </section>
    </div>
  );
}

function PracticeScreen({
  mode,
  setMode,
  selectedBeginner,
  setSelectedBeginner,
  audioPlaying,
  setAudioPlaying,
  onStartAdvanced
}) {
  return (
    <div className="ios-preview-screen">
      <SectionHeading
        eyebrow="Práctica"
        title="Elegí tu práctica"
        subtitle="Cada inicio crea una sesión nueva."
      />

      <section className="ios-preview-practice-section">
        <div className="ios-preview-section-label">
          <div><span>Principiante</span><strong>Audios disponibles</strong></div>
          <Headphones size={22} />
        </div>
        <div className="ios-preview-choice-list">
          {[1, 2].map((number) => (
            <button
              type="button"
              key={number}
              className={`ios-preview-choice${selectedBeginner === number ? " selected" : ""}`}
              onClick={() => setSelectedBeginner(number)}
            >
              <span className="ios-preview-choice-icon"><Waves size={19} /></span>
              <span><strong>Principiante {number}</strong><small>Audio completo · sin adelantar</small></span>
              {selectedBeginner === number ? <Check size={20} /> : <Circle size={20} />}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ios-preview-wide-action secondary"
          onClick={() => setAudioPlaying((value) => !value)}
        >
          {audioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {audioPlaying ? "Pausar audio" : "Iniciar práctica"}
        </button>
      </section>

      <section className="ios-preview-practice-section advanced-section">
        <div className="ios-preview-section-label">
          <div><span>Advanced</span><strong>Respiración y apnea</strong></div>
          <Brain size={23} />
        </div>
        <div className="ios-preview-segmented" role="group" aria-label="Modo Advanced">
          <button type="button" className={mode === "automatic" ? "active" : ""} onClick={() => setMode("automatic")}>Automático</button>
          <button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>Manual</button>
        </div>
        <button type="button" className="ios-preview-feature-row" onClick={onStartAdvanced}>
          <span className="ios-preview-round-action"><Play size={20} fill="currentColor" /></span>
          <span><strong>Iniciar sesión</strong><small>{mode === "automatic" ? "Configuración automática" : "Control manual de fases"}</small></span>
          <ChevronRight size={20} />
        </button>
        <button type="button" className="ios-preview-feature-row">
          <span className="ios-preview-choice-icon"><Settings2 size={19} /></span>
          <span><strong>Personalizar tiempos</strong><small>Inhalación, exhalación y recuperación</small></span>
          <ChevronRight size={20} />
        </button>
      </section>
    </div>
  );
}

function ProgressScreen() {
  const days = [true, true, true, true, true, true, true];
  return (
    <div className="ios-preview-screen">
      <SectionHeading eyebrow="Progreso" title="Tu evolución" subtitle="Prácticas, apneas, metas y logros personales." />
      <section className="ios-preview-progress-layout">
        <article className="ios-preview-data-panel">
          <div className="ios-preview-section-label"><div><span>Principiante</span><strong>7 de 7 días</strong></div><Headphones size={21} /></div>
          <div className="ios-preview-day-row">
            {days.map((done, index) => <span key={index} className={done ? "done" : ""}><Check size={15} /></span>)}
          </div>
          <div className="ios-preview-data-summary"><span><strong>7 días</strong>Racha</span><span><strong>10</strong>Sesiones</span><span><strong>18</strong>Totales</span></div>
        </article>

        <article className="ios-preview-data-panel chart-panel">
          <div className="ios-preview-section-label"><div><span>Advanced</span><strong>Evolución de apneas</strong></div><TimerReset size={21} /></div>
          <svg className="ios-preview-chart" viewBox="0 0 520 180" role="img" aria-label="Apneas en crecimiento de 64 a 124 segundos">
            <path className="chart-grid" d="M20 25H500M20 85H500M20 145H500" />
            <path className="chart-area" d="M20 135 L90 120 L160 105 L230 87 L300 70 L370 57 L440 45 L500 34 L500 160 L20 160 Z" />
            <path className="chart-line" d="M20 135 L90 120 L160 105 L230 87 L300 70 L370 57 L440 45 L500 34" />
            {["20,135", "90,120", "160,105", "230,87", "300,70", "370,57", "440,45", "500,34"].map((point) => {
              const [cx, cy] = point.split(",");
              return <circle key={point} cx={cx} cy={cy} r="4" />;
            })}
          </svg>
          <div className="ios-preview-data-summary"><span><strong>2:04</strong>Mejor</span><span><strong>1:58</strong>Última</span><span><strong>10</strong>Semana</span></div>
        </article>
      </section>
    </div>
  );
}

function GoalsScreen({ goals, onToggle, onBack, onContinue }) {
  const completed = goals.filter((goal) => goal.done).length;
  return (
    <div className="ios-preview-screen goals-screen">
      <button type="button" className="ios-preview-back" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      <SectionHeading eyebrow="Antes de empezar" title="Metas de hoy" subtitle="Marcá lo que ya cumpliste y entrá a tu sesión con un foco claro." />
      <section className="ios-preview-goal-summary">
        <span className="ios-preview-ring">{completed}/4</span>
        <div><strong>Tu foco para hoy</strong><small>{completed} completadas · {completed * 11} pts</small></div>
      </section>
      <div className="ios-preview-goal-list">
        {goals.map((goal) => (
          <button type="button" key={goal.id} className={`ios-preview-goal${goal.done ? " done" : ""}`} onClick={() => onToggle(goal.id)}>
            <span>{goal.done ? <Check size={16} /> : <Circle size={18} />}</span>
            <span><strong>{goal.title}</strong><small>{goal.meta}</small></span>
          </button>
        ))}
      </div>
      <button type="button" className="ios-preview-wide-action" onClick={onContinue}>Continuar a Advanced <ChevronRight size={18} /></button>
    </div>
  );
}

function HelpScreen() {
  return (
    <div className="ios-preview-screen">
      <SectionHeading eyebrow="Ayuda" title="Cómo usar la app" subtitle="Tutorial y respuestas para cada práctica." />
      <button type="button" className="ios-preview-tutorial">
        <img src="/preview-tutorial.png" alt="Vista previa del tutorial de Academia Cortex" />
        <span className="ios-preview-video-play"><Play size={24} fill="currentColor" /></span>
        <span><strong>Tutorial completo</strong><small>Inicio, Práctica, Advanced, Progreso y Ayuda</small></span>
      </button>
      <section className="ios-preview-help-list">
        <div className="ios-preview-section-label"><div><span>Guías rápidas</span><strong>Encontrá una respuesta</strong></div><BookOpen size={21} /></div>
        {["Primeros pasos", "Práctica Principiante", "Advanced Auto y Manual", "Metas Diarias"].map((title, index) => (
          <button type="button" className="ios-preview-feature-row" key={title}>
            <span className="ios-preview-choice-icon">{index + 1}</span>
            <span><strong>{title}</strong><small>Guía breve y respuestas frecuentes</small></span>
            <ChevronRight size={20} />
          </button>
        ))}
      </section>
    </div>
  );
}

function AdvancedSession({ paused, setPaused, onClose }) {
  return (
    <div className="ios-preview-session">
      <header><button type="button" onClick={onClose}><ArrowLeft size={19} /><span>Salir</span></button><strong>Advanced</strong><span /></header>
      <div className="ios-preview-session-content">
        <span className="ios-preview-mode-pill">Automático</span>
        <p>Inhalá</p>
        <img src="/preview-advanced-orb.png" alt="Núcleo visual de respiración Advanced" />
        <div className="ios-preview-breath-count"><strong>2</strong><span>de 42 respiraciones</span></div>
        <div className="ios-preview-cycle-progress"><span>Ciclo 1 de 5</span><div><i /></div></div>
        <section className="ios-preview-session-stats"><span><strong>1 / 42</strong>Respiraciones</span><span><strong>2:04</strong>Última apnea</span><span><strong>2:04</strong>Mejor de hoy</span></section>
        <button type="button" className="ios-preview-session-pause" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Reanudar" : "Pausar"}>
          {paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
        </button>
        <button type="button" className="ios-preview-finish" onClick={onClose}>Finalizar sesión</button>
      </div>
    </div>
  );
}

export default function IosUxWebPreview() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("automatic");
  const [selectedBeginner, setSelectedBeginner] = useState(1);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const completedGoals = useMemo(() => goals.filter((goal) => goal.done).length, [goals]);

  const navigate = (nextScreen) => {
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (sessionActive) {
    return <AdvancedSession paused={sessionPaused} setPaused={setSessionPaused} onClose={() => setSessionActive(false)} />;
  }

  const visibleTab = NAV_ITEMS.some((item) => item.id === screen) ? screen : "practice";

  return (
    <div className="ios-preview-shell">
      <aside className="ios-preview-sidebar">
        <div className="ios-preview-brand"><img src="/logo-05-light.png" alt="Academia Cortex" /><span>RM Web</span></div>
        <nav>{NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={visibleTab === item.id} onClick={() => navigate(item.id)} />)}</nav>
        <small>Vista conceptual basada en iOS 1.0.3</small>
      </aside>

      <header className="ios-preview-mobile-header"><img src="/logo-05-light.png" alt="Academia Cortex" /><Target size={21} /></header>

      <main>
        {screen === "home" && <HomeScreen onNavigate={navigate} completedGoals={completedGoals} />}
        {screen === "practice" && (
          <PracticeScreen
            mode={mode}
            setMode={setMode}
            selectedBeginner={selectedBeginner}
            setSelectedBeginner={setSelectedBeginner}
            audioPlaying={audioPlaying}
            setAudioPlaying={setAudioPlaying}
            onStartAdvanced={() => navigate("goals")}
          />
        )}
        {screen === "progress" && <ProgressScreen />}
        {screen === "goals" && (
          <GoalsScreen
            goals={goals}
            onToggle={(id) => setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, done: !goal.done } : goal))}
            onBack={() => navigate("practice")}
            onContinue={() => setSessionActive(true)}
          />
        )}
        {screen === "help" && <HelpScreen />}
      </main>

      <nav className="ios-preview-bottom-nav">
        {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={visibleTab === item.id} onClick={() => navigate(item.id)} />)}
      </nav>
    </div>
  );
}
