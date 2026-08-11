import { useEffect, useState } from "react";
import StudentExperienceShell from "../student-experience/StudentExperienceShell";

const DEMO_PRACTICES = [
  { id: "principiante", label: "Reprogramación Mental Principiante", enabled: true, status: "" },
  { id: "reprogramacion", label: "Reprogramación Mental Advanced", enabled: true, status: "" },
  { id: "metas", label: "Metas Diarias", enabled: true, status: "" },
  { id: "colores", label: "Práctica de visualización de colores", enabled: true, status: "" },
  { id: "remota", label: "Práctica de visión remota", enabled: false, status: "Próximamente" },
  { id: "meditacion", label: "Práctica de meditación", enabled: false, status: "Próximamente" }
];

const DEMO_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label, index) => ({
  key: `demo-${index}`,
  label,
  shortLabel: label.slice(0, 1),
  done: index < 6
}));

export default function IosUxWebPreview() {
  const [activeTab, setActiveTab] = useState("home");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <StudentExperienceShell
      studentName="Alex Cortex"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      practiceOptions={DEMO_PRACTICES}
      beginnerAudioCount={2}
      beginnerCompletedDays={7}
      beginnerRequiredDays={7}
      advancedUnlocked
      advancedStatus="Disponible"
      advancedCycles={5}
      weeklyActivity={DEMO_WEEK}
      weeklySessions={10}
      currentStreak={7}
      totalSessions={18}
      bestApneaLabel="2:04"
      lastApneaLabel="1:58"
      apneaDays={[
        { dateKey: "demo-1", label: "Hoy", total: 5, bestLabel: "2:04" },
        { dateKey: "demo-2", label: "Ayer", total: 5, bestLabel: "1:58" },
        { dateKey: "demo-3", label: "Sáb 08/08", total: 5, bestLabel: "1:54" }
      ]}
      onOpenPractice={() => {}}
      onOpenGoals={() => {}}
      onOpenApneaHistory={() => {}}
      theme={theme}
      onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
    />
  );
}
