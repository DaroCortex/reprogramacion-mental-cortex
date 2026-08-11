import assert from "node:assert/strict";
import {
  buildBeginnerMediaMetadata,
  installBeginnerMediaSession,
  syncBeginnerMediaSession
} from "../src/beginner-media-session.js";

const handlers = new Map();
const mediaSession = {
  metadata: null,
  playbackState: "none",
  positionState: null,
  setActionHandler(action, handler) {
    handlers.set(action, handler);
  },
  setPositionState(value) {
    this.positionState = value;
  }
};

class FakeMediaMetadata {
  constructor(value) {
    Object.assign(this, value);
  }
}

const audio = {
  currentTime: 120,
  duration: 1800,
  playbackRate: 1,
  paused: false,
  ended: false,
  playCalls: 0,
  pauseCalls: 0,
  async play() {
    this.playCalls += 1;
    this.paused = false;
  },
  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
};
const playbackState = {
  shouldBePlaying: true,
  lastAllowedPosition: 120,
  maxPositionSeconds: 120
};
const notices = [];
let checkpoints = 0;

const cleanup = installBeginnerMediaSession({
  mediaSession,
  MediaMetadataCtor: FakeMediaMetadata,
  metadata: buildBeginnerMediaMetadata({ label: "Audio basico 1" }),
  getAudio: () => audio,
  getPlaybackState: () => playbackState,
  onNotice: (message) => notices.push(message),
  onCheckpoint: () => {
    checkpoints += 1;
  }
});

assert.equal(mediaSession.metadata.title, "Audio basico 1");
assert.equal(mediaSession.metadata.artist, "Academia Cortex");
assert.equal(mediaSession.playbackState, "playing");
assert.deepEqual(mediaSession.positionState, {
  duration: 1800,
  playbackRate: 1,
  position: 120
});

handlers.get("seekforward")();
assert.equal(audio.currentTime, 120, "lock-screen forward seeking must remain blocked");
assert.equal(notices.length, 1);

handlers.get("seekto")({ seekTime: 240 });
assert.equal(audio.currentTime, 120, "seekto must not jump past the listened position");

handlers.get("seekbackward")({ seekOffset: 10 });
assert.equal(audio.currentTime, 110, "rewinding remains available");
assert.equal(playbackState.lastAllowedPosition, 110);

handlers.get("pause")();
assert.equal(playbackState.shouldBePlaying, false);
assert.equal(audio.paused, true);
assert.equal(checkpoints, 0, "the native pause event remains responsible for the checkpoint");

handlers.get("pause")();
assert.equal(checkpoints, 1, "an already-paused player still flushes a checkpoint");

await handlers.get("play")();
assert.equal(playbackState.shouldBePlaying, true);
assert.equal(audio.paused, false);
assert.equal(audio.playCalls, 1);

audio.currentTime = 1900;
syncBeginnerMediaSession(mediaSession, audio);
assert.equal(mediaSession.positionState.position, 1800, "position state must stay within duration");

cleanup();
assert.equal(mediaSession.metadata, null);
assert.equal(mediaSession.playbackState, "none");
for (const action of ["play", "pause", "stop", "seekbackward", "seekto", "seekforward"]) {
  assert.equal(handlers.get(action), null, `cleanup must remove ${action}`);
}

console.log("beginner media session tests passed");
