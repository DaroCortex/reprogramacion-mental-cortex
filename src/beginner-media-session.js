const DEFAULT_SEEK_BACK_SECONDS = 10;
const FORWARD_SEEK_TOLERANCE_SECONDS = 1.5;

export const buildBeginnerMediaMetadata = ({ label = "Audio Principiante", artwork = [] } = {}) => ({
  title: label,
  artist: "Academia Cortex",
  album: "Reprogramacion Mental",
  artwork
});

const setActionHandler = (mediaSession, action, handler) => {
  try {
    mediaSession.setActionHandler(action, handler);
  } catch (_error) {
    // Some browsers expose Media Session but not every action.
  }
};

const setCurrentTime = (audio, position) => {
  if (!audio || !Number.isFinite(position)) return;
  if (typeof audio.fastSeek === "function") {
    audio.fastSeek(position);
    return;
  }
  audio.currentTime = position;
};

export const syncBeginnerMediaSession = (mediaSession, audio) => {
  if (!mediaSession || !audio) return;

  try {
    mediaSession.playbackState = audio.ended ? "none" : audio.paused ? "paused" : "playing";
  } catch (_error) {
    // Ignore partial Media Session implementations.
  }

  const duration = Number(audio.duration);
  const position = Number(audio.currentTime);
  const playbackRate = Number(audio.playbackRate) || 1;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;

  try {
    mediaSession.setPositionState({
      duration,
      playbackRate,
      position: Math.min(duration, Math.max(0, position))
    });
  } catch (_error) {
    // setPositionState is optional and can reject incomplete media metadata.
  }
};

export const installBeginnerMediaSession = ({
  mediaSession,
  MediaMetadataCtor,
  metadata,
  getAudio,
  getPlaybackState,
  onNotice = () => {},
  onCheckpoint = () => {},
  onPlayError = () => {}
}) => {
  if (!mediaSession || typeof mediaSession.setActionHandler !== "function") {
    return () => {};
  }

  try {
    mediaSession.metadata = MediaMetadataCtor ? new MediaMetadataCtor(metadata) : metadata;
  } catch (_error) {
    mediaSession.metadata = null;
  }

  setActionHandler(mediaSession, "play", async () => {
    const audio = getAudio();
    const state = getPlaybackState();
    if (!audio) return;
    if (state) state.shouldBePlaying = true;
    try {
      await audio.play();
      syncBeginnerMediaSession(mediaSession, audio);
    } catch (error) {
      onPlayError(error);
    }
  });

  setActionHandler(mediaSession, "pause", () => {
    const audio = getAudio();
    const state = getPlaybackState();
    const wasPaused = Boolean(audio?.paused);
    if (state) state.shouldBePlaying = false;
    audio?.pause();
    if (wasPaused) onCheckpoint();
    syncBeginnerMediaSession(mediaSession, audio);
  });

  setActionHandler(mediaSession, "stop", () => {
    const audio = getAudio();
    const state = getPlaybackState();
    const wasPaused = Boolean(audio?.paused);
    if (state) state.shouldBePlaying = false;
    audio?.pause();
    if (wasPaused) onCheckpoint();
    syncBeginnerMediaSession(mediaSession, audio);
  });

  setActionHandler(mediaSession, "seekbackward", (details = {}) => {
    const audio = getAudio();
    const state = getPlaybackState();
    if (!audio) return;
    const offset = Number(details.seekOffset) || DEFAULT_SEEK_BACK_SECONDS;
    const nextPosition = Math.max(0, Number(audio.currentTime || 0) - offset);
    setCurrentTime(audio, nextPosition);
    if (state) state.lastAllowedPosition = nextPosition;
    syncBeginnerMediaSession(mediaSession, audio);
  });

  setActionHandler(mediaSession, "seekto", (details = {}) => {
    const audio = getAudio();
    const state = getPlaybackState();
    if (!audio || !Number.isFinite(Number(details.seekTime))) return;
    const requestedPosition = Number(details.seekTime);
    const allowedPosition = Math.max(
      0,
      Number(state?.lastAllowedPosition || state?.maxPositionSeconds || audio.currentTime || 0)
    );
    if (requestedPosition > allowedPosition + FORWARD_SEEK_TOLERANCE_SECONDS) {
      onNotice("No se puede adelantar el audio. Tu practica sigue en el ultimo punto escuchado.");
      return;
    }
    setCurrentTime(audio, Math.max(0, requestedPosition));
    if (state) state.lastAllowedPosition = Math.max(0, requestedPosition);
    syncBeginnerMediaSession(mediaSession, audio);
  });

  setActionHandler(mediaSession, "seekforward", () => {
    onNotice("No se puede adelantar el audio. Tu practica sigue en el ultimo punto escuchado.");
  });

  syncBeginnerMediaSession(mediaSession, getAudio());

  return () => {
    ["play", "pause", "stop", "seekbackward", "seekto", "seekforward"].forEach((action) => {
      setActionHandler(mediaSession, action, null);
    });
    try {
      mediaSession.playbackState = "none";
      mediaSession.metadata = null;
    } catch (_error) {
      // Ignore cleanup failures from partial implementations.
    }
  };
};
