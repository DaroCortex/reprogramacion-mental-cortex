const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const formatVolume = (value) => `${Math.round(clampVolume(value) * 100)}%`;

export default function AdvancedPersonalAudioControls({
  breathingVolume,
  apneaVolume,
  onBreathingVolumeChange,
  onApneaVolumeChange
}) {
  return (
    <>
      <label className="span-full advanced-personal-volume">
        <span className="advanced-volume-heading">
          <span>Audio personalizado en respiración y recuperación</span>
          <strong>{formatVolume(breathingVolume)}</strong>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={clampVolume(breathingVolume)}
          onChange={(event) => onBreathingVolumeChange(Number(event.target.value))}
        />
      </label>
      <label className="span-full advanced-personal-volume">
        <span className="advanced-volume-heading">
          <span>Audio personalizado en apnea</span>
          <strong>{formatVolume(apneaVolume)}</strong>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={clampVolume(apneaVolume)}
          onChange={(event) => onApneaVolumeChange(Number(event.target.value))}
        />
      </label>
    </>
  );
}
