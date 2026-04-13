import { getSurfData } from "./getSurfData.ts";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TMP = "/tmp/wave-post";
const STATE_FILE = path.join(ROOT, "wave-state.json");
fs.mkdirSync(TMP, { recursive: true });

const GOOGLE_TTS_API_KEY     = process.env.GOOGLE_TTS_API_KEY ?? "";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID   = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
const GITHUB_REPOSITORY      = process.env.GITHUB_REPOSITORY ?? "kiki3903/ishinoura-wave";
const VIDEOS_RELEASE_TAG     = "videos";
const DAILY_RELEASE_TAG      = "daily";
const THRESHOLD              = 0.20;

function getVideoFile(h) {
  if (h < 0.4) return "grandpa_sune.mp4";
  if (h < 0.6) return "grandpa_hiza.mp4";
  if (h < 0.8) return "grandpa_momo.mp4";
  if (h < 1.0) return "grandpa_koshi.mp4";
  if (h < 1.2) return "grandpa_hara.mp4";
  if (h < 1.4) return "grandpa_mune.mp4";
  if (h < 1.6) return "grandpa_kata.mp4";
  return "grandpa_atama.mp4";
}

function getWaveLabel(h) {
  if (h < 0.4) return "スネ";
  if (h < 0.6) return "ヒザ";
  if (h < 0.8) return "モモ";
  if (h < 1.0) return "コシ";
  if (h < 1.2) return "ハラ";
  if (h < 1.4) return "ムネ";
  if (h < 1.6) return "カタ";
  return "アタマ";
}

function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const dataSize = pcmBuffer.length;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
  wav.writeUInt16LE(channels * bitDepth / 8, 32);
  wav.writeUInt16LE(bitDepth, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, 44);
  return wav;
}

async function generateVoice(text) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "ja-JP", name: "ja-JP-Neural2-D" },
      audioConfig: { audioEncoding: "LINEAR16" },
    }),
  });
  if (!res.ok) throw new Error(`TTS error: ${res.status}`);
  const json = await res.json();
  const pcm = Buffer.from(json.audioContent, "base64");
  return pcmToWav(pcm, 24000);
}

// 前回の波高を読み込む
let lastWaveHeight = null;
if (fs.existsSync(STATE_FILE)) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  lastWaveHeight = state.waveHeight ?? null;
}

const data = await getSurfData();
const currentHeight = data.waveHeight;

console.log(`前回波高: ${lastWaveHeight ?? "なし"}`);
console.log(`現在波高: ${currentHeight}`);

if (lastWaveHeight !== null) {
  const diff = Math.abs(currentHeight - lastWaveHeight);
  console.log(`変化量: ${diff.toFixed(2)}m`);
  if (diff < THRESHOLD) {
    console.log("変化なし。投稿スキップ。");
    process.exit(0);
  }
  console.log(`変化あり（${diff.toFixed(2)}m）→ 再投稿します！`);
}

const videoFile = getVideoFile(currentHeight);
const waveLabel = getWaveLabel(currentHeight);

const line1 = `${data.dateText}の磯ノ浦は`;
const line2 = `${data.weather} ${data.windDirection}の風`;
const line3 = `波は${waveLabel}(${currentHeight.toFixed(2)}m)${data.tideType}`;
const line4 = `干潮${data.kocho} 満潮${data.mancho}`;

const inputVideo = path.join(TMP, "input.mp4");
const voicePath  = path.join(TMP, "voice.wav");
const outputVideo = path.join(TMP, "output.mp4");

const videoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${VIDEOS_RELEASE_TAG}/${videoFile}`;
execSync(`curl -fL -o "${inputVideo}" "${videoUrl}"`, { stdio: "inherit" });

const voiceText =
  `${data.dateText}の磯ノ浦は${data.weather}！` +
  `${data.windDirection}の風${data.windSpeed}メートル！` +
  `波は${waveLabel}！${data.tideType}で干潮${data.kocho}、満潮${data.mancho}です！`;
const wav = await generateVoice(voiceText);
fs.writeFileSync(voicePath, wav);

const fontPath = execSync("fc-match -f '%{file}' 'Noto Sans CJK JP:style=Bold'").toString().trim();
const lineHeight = 38;
const baseY = 780;
const ffmpegCmd = [
  "ffmpeg -y",
  `-i "${inputVideo}"`,
  `-i "${voicePath}"`,
  `-filter_complex`,
  `"[0:v]` +
    `drawtext=fontfile='${fontPath}':text='${line1}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line2}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line3}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight * 2}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line4}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight * 3}:borderw=3:bordercolor=black` +
  `[v]"`,
  `-map "[v]" -map "1:a"`,
  `-shortest -r 30 -c:v libx264 -profile:v main -level 3.1 -c:a aac`,
  `"${outputVideo}"`,
].join(" ");
execSync(ffmpegCmd, { stdio: "inherit" });

execSync(
  `gh release upload ${DAILY_RELEASE_TAG} "${outputVideo}" --clobber --repo "${GITHUB_REPOSITORY}"`,
  { stdio: "inherit" }
);

const publicVideoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${DAILY_RELEASE_TAG}/output.mp4`;
const resolvedRes = await fetch(publicVideoUrl, { method: 'HEAD', redirect: 'follow' });
const directVideoUrl = resolvedRes.url;

const { postToInstagram } = await import("./daily-post.js");
const caption =
  `${data.dateText}の磯ノ浦\n` +
  `${data.weather} ${data.windDirection}の風\n` +
  `波は${waveLabel}(${currentHeight.toFixed(2)}m)${data.tideType}\n` +
  `干潮${data.kocho} 満潮${data.mancho}\n` +
  `#磯ノ浦 #サーフィン #波情報 #和歌山 #ishinoura`;
const postId = await postToInstagram(directVideoUrl, caption);
console.log(`\n✅ 再投稿完了！ Post ID: ${postId}`);

fs.writeFileSync(STATE_FILE, JSON.stringify({
  waveHeight: currentHeight,
  postedAt: new Date().toISOString()
}), "utf8");
