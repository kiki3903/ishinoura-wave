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

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY ?? "kiki3903/ishinoura-wave";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const VIDEOS_RELEASE_TAG = "videos";
const DAILY_RELEASE_TAG = "daily";
const THRESHOLD = 0.20; // 20cm

function getVideoFile(h) {
  if (h < 0.4) return "grandpa_sune.mp4";
  if (h < 0.6) return "grandpa_hiza.mp4";
  if (h < 0.8) return "grandpa_momo.mp4";
  if (h < 1.0) return "grandpa_koshi.mp4";
  if (h < 1.3) return "grandpa_mune.mp4";
  if (h < 1.6) return "grandpa_kata.mp4";
  if (h < 2.0) return "grandpa_overhead.mp4";
  return "grandpa_double.mp4";
}

function getWaveLabel(h) {
  if (h < 0.4) return "スネ";
  if (h < 0.6) return "ヒザ";
  if (h < 0.8) return "モモ";
  if (h < 1.0) return "コシ";
  if (h < 1.3) return "ムネ";
  if (h < 1.6) return "カタ";
  if (h < 2.0) return "オーバーヘッド";
  return "ダブル以上";
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

// 変化量チェック
if (lastWaveHeight !== null) {
  const diff = Math.abs(currentHeight - lastWaveHeight);
  console.log(`変化量: ${diff.toFixed(2)}m`);
  if (diff < THRESHOLD) {
    console.log("変化なし。投稿スキップ。");
    process.exit(0);
  }
  console.log(`変化あり（${diff.toFixed(2)}m）→ 再投稿します！`);
}

// 投稿処理（daily-post.jsと同じ流れ）
const videoFile = getVideoFile(currentHeight);
const waveLabel = getWaveLabel(currentHeight);
const subtitle =
  `${data.dateText}の磯ノ浦は${data.weather} 風速${data.windSpeed}m${data.windDirection}風 ` +
  `波は${waveLabel} (${currentHeight.toFixed(2)}m) 皆さんご安全に！`;

const inputVideo = path.join(TMP, "input.mp4");
const voicePath = path.join(TMP, "voice.wav");
const subtitleFile = path.join(TMP, "subtitle.txt");
const outputVideo = path.join(TMP, "output.mp4");

// 動画ダウンロード
const videoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${VIDEOS_RELEASE_TAG}/${videoFile}`;
execSync(`curl -fL -o "${inputVideo}" "${videoUrl}"`, { stdio: "inherit" });

// 音声生成
const { generateVoice } = await import("./generate-voice.js");
fs.writeFileSync(voicePath, await generateVoice(subtitle));

// ffmpeg合成
fs.writeFileSync(subtitleFile, subtitle, "utf8");
const fontPath = execSync("fc-match -f '%{file}' 'Noto Sans CJK JP:style=Bold'").toString().trim();
const ffmpegCmd = [
  "ffmpeg -y",
  `-i "${inputVideo}"`,
  `-i "${voicePath}"`,
  `-filter_complex`,
  `"[0:v]drawtext=fontfile='${fontPath}':textfile='${subtitleFile}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=h-110:borderw=3:bordercolor=black[v]"`,
  `-map "[v]" -map "1:a"`,
  `-shortest -r 30 -c:v libx264 -profile:v main -level 3.1 -c:a aac`,
  `"${outputVideo}"`,
].join(" ");
execSync(ffmpegCmd, { stdio: "inherit" });

// GitHub Releasesにアップロード
execSync(
  `gh release upload ${DAILY_RELEASE_TAG} "${outputVideo}" --clobber --repo "${GITHUB_REPOSITORY}"`,
  { stdio: "inherit" }
);

const publicVideoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${DAILY_RELEASE_TAG}/output.mp4`;
const resolvedRes = await fetch(publicVideoUrl, { method: 'HEAD', redirect: 'follow' });
const directVideoUrl = resolvedRes.url;

// Instagram投稿
const caption = `${data.dateText}の磯ノ浦\n${data.weather} ${data.windDirection}の風${data.windSpeed}メートル！\n波は${waveLabel}！皆さんご安全に！\n#磯ノ浦 #波情報 #サーフィン`;
const { postToInstagram } = await import("./daily-post.js");
const postId = await postToInstagram(directVideoUrl, caption);
console.log(`\n✅ 再投稿完了！ Post ID: ${postId}`);

// 状態保存
fs.writeFileSync(STATE_FILE, JSON.stringify({ waveHeight: currentHeight, postedAt: new Date().toISOString() }), "utf8");
