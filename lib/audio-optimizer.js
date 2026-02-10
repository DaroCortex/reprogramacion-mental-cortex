import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

const HEAVY_BYTES = 8 * 1024 * 1024;

const safeStem = (fileName) => {
  const base = String(fileName || "audio")
    .replace(/\\/g, "/")
    .split("/")
    .pop();
  const stem = base.replace(/\.[a-zA-Z0-9]+$/, "");
  return stem
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "") || "audio";
};

const runFfmpeg = (args) =>
  new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg no disponible"));
      return;
    }
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exit ${code}`));
    });
  });

const buildFilter = (heavy) => {
  const threshold = heavy ? "-36dB" : "-40dB";
  // Corta silencios largos y deja pequeño margen natural.
  const silence = `silenceremove=start_periods=1:start_threshold=${threshold}:start_silence=0.22:stop_periods=-1:stop_threshold=${threshold}:stop_silence=0.40`;
  const norm = "loudnorm=I=-16:TP=-1.5:LRA=11";
  return `${silence},${norm}`;
};

const optimizeAudioBuffer = async ({ inputBuffer, fileName }) => {
  const originalBytes = inputBuffer.length;
  const heavy = originalBytes >= HEAVY_BYTES;
  const bitrate = heavy ? "96k" : "128k";
  const mode = heavy ? "compress+trim" : "trim+normalize";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = os.tmpdir();
  const inFile = path.join(tmpDir, `rmcortex-in-${id}.bin`);
  const outFile = path.join(tmpDir, `rmcortex-out-${id}.mp3`);

  await fs.writeFile(inFile, inputBuffer);

  try {
    const args = [
      "-y",
      "-i",
      inFile,
      "-vn",
      "-af",
      buildFilter(heavy),
      "-ar",
      "44100",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      bitrate,
      outFile
    ];
    await runFfmpeg(args);
    const outputBuffer = await fs.readFile(outFile);
    return {
      buffer: outputBuffer,
      contentType: "audio/mpeg",
      extension: "mp3",
      optimization: {
        applied: true,
        mode,
        originalBytes,
        finalBytes: outputBuffer.length,
        ratio: Number((outputBuffer.length / originalBytes).toFixed(3))
      }
    };
  } catch (error) {
    return {
      buffer: inputBuffer,
      contentType: null,
      extension: path.extname(fileName || "").replace(".", "").toLowerCase() || "mp3",
      optimization: {
        applied: false,
        mode: "original-fallback",
        originalBytes,
        finalBytes: originalBytes,
        ratio: 1,
        reason: error?.message || "ffmpeg error"
      }
    };
  } finally {
    await Promise.allSettled([fs.unlink(inFile), fs.unlink(outFile)]);
  }
};

const buildAudioKey = (fileName, extension = "mp3") => {
  const stem = safeStem(fileName);
  const ext = String(extension || "mp3").replace(/^\./, "").toLowerCase();
  return `audios/${Date.now()}-${stem}.${ext}`;
};

export { optimizeAudioBuffer, buildAudioKey };
