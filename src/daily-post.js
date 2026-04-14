/**
 * daily-post.js — 毎日の自動投稿スクリプト
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSurfData } from "./getSurfData.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TMP = "/tmp/wave-post";
fs.mkdirSync(TMP, { recursive: true });

const GOOGLE_TTS_API_KEY     = process.env.GOOGLE_TTS_API_KEY ?? "";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID   = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
const GITHUB_REPOSITORY      = process.env.GITHUB_REPOSITORY ?? "kiki3903/ishinoura-wave";
const VIDEOS_RELEASE_TAG     = "videos";
const DAILY_RELEASE_TAG      = "daily";

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
  if (!res.ok) throw new Error(`Cloud TTS error: HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.audioContent) throw new Error("Cloud TTS: 音声データなし");
  const pcm = Buffer.from(json.audioContent, "base64");
  return pcmToWav(pcm, 24000);
}

export async function postToInstagram(videoUrl, caption) {
  console.log("  Instagram: メディアコンテナ作成中...");
  const containerRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(`コンテナ作成失敗: ${JSON.stringify(container)}`);
  console.log(`  Container ID: ${container.id}`);

  console.log("  動画処理中...");
  let status = "IN_PROGRESS";
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v20.0/${container.id}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const s = await statusRes.json();
    status = s.status_code;
    console.log(`  Status: ${status} (${i + 1}/30)`);
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error(`動画処理エラー: ${JSON.stringify(s)}`);
  }
  if (status !== "FINISHED") throw new Error("タイムアウト: 動画処理が完了しませんでした");

  console.log("  投稿中...");
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const published = await publishRes.json();
  if (!published.id) throw new Error(`投稿失敗: ${JSON.stringify(published)}`);
  return published.id;
}

console.log("=".repeat(56));
console.log(" 磯ノ浦 Daily Wave Post");
console.log("=".repeat(56));

console.log("\n[1/6] サーフデータ取得中...");
const data = await getSurfData();
const videoFile = getVideoFile(data.waveHeight);
const waveLabel = getWaveLabel(data.waveHeight);

const line1 = `${data.dateText}の磯ノ浦は`;
const line2 = `${data.weather} ${data.windDirection}の風`;
const line3 = `波は${waveLabel}(${data.waveHeight.toFixed(2)}m)`;
const line4 = `干潮${data.kocho} 満潮${data.mancho} ${data.tideType}`;
const line4Escaped = line4.replace(/:/g, "\\:");

console.log(`  波高: ${data.waveHeight}m (${waveLabel}) → ${videoFile}`);
console.log(`  字幕: ${line1} / ${line2} / ${line3} / ${line4}`);

console.log(`\n[2/6] 動画ダウンロード: ${videoFile}`);
const inputVideo = path.join(TMP, "input.mp4");
const videoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${VIDEOS_RELEASE_TAG}/${videoFile}`;
execSync(`curl -fL -o "${inputVideo}" "${videoUrl}"`, { stdio: "inherit" });

console.log("\n[3/6] Cloud TTS で音声生成中...");
const voiceText =
  `${data.dateText}の磯ノ浦は${data.weather}！` +
  `${data.windDirection}の風！` +
  `波は${waveLabel}！皆さんご安全に！`;
const voicePath = path.join(TMP, "voice.wav");
const wav = await generateVoice(voiceText);
fs.writeFileSync(voicePath, wav);
console.log(`  保存: ${voicePath}`);

console.log("\n[4/6] ffmpeg で合成中...");
const fontPath = execSync("fc-match -f '%{file}' 'Noto Sans CJK JP:style=Bold'")
  .toString().trim();
console.log(`  フォント: ${fontPath}`);

const outputVideo = path.join(TMP, "output.mp4");
const lineHeight = 38;
const baseY = 660;
const ffmpegCmd = [
  "ffmpeg -y",
  `-i "${inputVideo}"`,
  `-i "${voicePath}"`,
  `-filter_complex`,
  `"[0:v]` +
    `drawtext=fontfile='${fontPath}':text='${line1}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line2}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line3}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight * 2}:borderw=3:bordercolor=black,` +
    `drawtext=fontfile='${fontPath}':text='${line4Escaped}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${baseY + lineHeight * 3}:borderw=3:bordercolor=black` +
  `[v]"`,
  `-map "[v]" -map "1:a"`,
  `-r 30 -c:v libx264 -profile:v main -level 3.1 -c:a aac`,
  `"${outputVideo}"`,
].join(" ");
execSync(ffmpegCmd, { stdio: "inherit" });
console.log(`  出力: ${outputVideo}`);

console.log(`\n[5/6] GitHub Releases にアップロード (${DAILY_RELEASE_TAG})...`);
execSync(
  `gh release upload ${DAILY_RELEASE_TAG} "${outputVideo}" --clobber --repo "${GITHUB_REPOSITORY}"`,
  { stdio: "inherit" }
);
const publicVideoUrl = `https://github.com/${GITHUB_REPOSITORY}/releases/download/${DAILY_RELEASE_TAG}/output.mp4`;
const resolvedRes = await fetch(publicVideoUrl, { method: 'HEAD', redirect: 'follow' });
const directVideoUrl = resolvedRes.url;
console.log(`  直接URL: ${directVideoUrl}`);

console.log("\n[6/6] Instagram に投稿中...");
const caption =
  `${data.dateText}の磯ノ浦\n` +
  `${data.weather} ${data.windDirection}の風\n` +
  `波は${waveLabel}(${data.waveHeight.toFixed(2)}m)\n` +
  `干潮${data.kocho} 満潮${data.mancho} ${data.tideType}\n` +
  `#磯ノ浦 #サーフィン #波情報 #和歌山 #ishinoura`;
const postId = await postToInstagram(directVideoUrl, caption);
console.log(`\n✅ 投稿完了！ Post ID: ${postId}`);
