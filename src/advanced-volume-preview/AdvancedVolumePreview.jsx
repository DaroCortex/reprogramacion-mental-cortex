import { useEffect, useState } from "react";
import AdvancedPersonalAudioControls from "../AdvancedPersonalAudioControls";

export default function AdvancedVolumePreview() {
  const [breathingVolume, setBreathingVolume] = useState(0.32);
  const [apneaVolume, setApneaVolume] = useState(0.96);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div className="app practice-app advanced-volume-preview">
      <header className="header">
        <div>
          <p className="eyebrow">Advanced</p>
          <h1>Configuración</h1>
        </div>
      </header>
      <main
        className="practice-grid"
        style={{ gridTemplateColumns: "minmax(0, 620px)", justifyContent: "center" }}
      >
        <section className="card practice-screen practice-section practice-section-manual-card">
          <div className="manual-head">
            <p className="eyebrow">Ajustes finos</p>
            <h3>Manual</h3>
          </div>
          <div className="form-grid practice-section-manual manual-config-grid">
            <label>
              Respiraciones por ciclo
              <input type="number" value="30" readOnly />
            </label>
            <label>
              Inhalar (segundos)
              <input type="number" value="2" readOnly />
            </label>
            <label>
              Exhalar (segundos)
              <input type="number" value="2" readOnly />
            </label>
            <label>
              Recuperación (segundos)
              <input type="number" value="15" readOnly />
            </label>
            <label>
              Ciclos
              <input type="number" value="5" readOnly />
            </label>
            <label className="span-full advanced-personal-volume">
              <span className="advanced-volume-heading">
                <span>Volumen guía inhala / exhala</span>
                <strong>100%</strong>
              </span>
              <input type="range" min="0" max="1" step="0.05" value="1" readOnly />
            </label>
            <AdvancedPersonalAudioControls
              breathingVolume={breathingVolume}
              apneaVolume={apneaVolume}
              onBreathingVolumeChange={setBreathingVolume}
              onApneaVolumeChange={setApneaVolume}
            />
            <label className="span-full">
              Reverb audio personalizado
              <div className="preset-row">
                <button type="button" className="chip active">Suave</button>
                <button type="button" className="chip">Cámara</button>
                <button type="button" className="chip">Off</button>
              </div>
              <input type="range" min="0" max="1" step="0.01" value="0.12" readOnly />
            </label>
          </div>
          <button type="button" className="ghost manual-close">Ocultar manual</button>
        </section>
      </main>
    </div>
  );
}
