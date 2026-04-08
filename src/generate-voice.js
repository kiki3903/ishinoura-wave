/**
 * Google Cloud Text-to-Speech API を使って音声を生成し、
 * public/voice.wav として保存するスクリプト。
 *
 * 使い方:
 *   node src/generate-voice.js                        # Marine API から自動取得
 *   node src/generate-voice.js 1.2                    # 波高を直接指定
 *   node src/generate-voice.js output/props_sune.json # JSONファイルから全データ読み込み
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSurfData } from "./getSurfData.ts";

// ── 設定 ───────────────────────────────────────────────────────
const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY ?? "";
const TTS_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

// ── 波レベル判定 ──────────────────────────────────────────────
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

// ── テキスト生成 ──────────────────────────────────────────────
function buildText({ waveHeight, windSpeed, windDirection, dateText, weather }) {
  const label = getWaveLabel(waveHeight);
  return (
    `${dateText}の磯ノ浦は${weather}！` +
    `${windDirection}の風${windSpeed}メートル！` +
    `波は${label}！皆さんご安全に！`
  );
}

// ── PCM → WAV 変換 ────────────────────────────────────────────
function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const dataSize = pcmBuffer.length;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);                              // PCM
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

// ── Cloud Text-to-Speech API ──────────────────────────────────
async function generateVoice(text) {
  const body = {
    input: { text },
    voice: {
      languageCode: "ja-JP",
      name: "ja-JP-Neural2-D",
    },
    audioConfig: {
      audioEncoding: "LINEAR16",
    },
  };

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Cloud TTS error: HTTP ${res.status}: ${msg}`);
  }

  const json = await res.json();
  if (!json.audioContent) {
    throw new Error(`Cloud TTS: 音声データが返ってきませんでした: ${JSON.stringify(json)}`);
  }

  // LINEAR16 は 24000Hz mono の PCM → WAV ヘッダを付ける
  const pcm = Buffer.from(json.audioContent, "base64");
  const sampleRate = 24000;
  return { wav: pcmToWav(pcm, sampleRate), sampleRate };
}

// ── メイン ────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  let data;

  if (arg !== undefined && arg.endsWith(".json")) {
    const jsonPath = path.resolve(process.cwd(), arg);
    data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    console.log(`props を読み込み: ${jsonPath}`);
  } else {
    console.log("API からデータ取得中...");
    data = await getSurfData();

    if (arg !== undefined) {
      const overrideH = parseFloat(arg);
      if (isNaN(overrideH)) {
        console.error(`Invalid argument: "${arg}"`);
        process.exit(1);
      }
      data.waveHeight = overrideH;
      console.log(`波高（上書き）: ${overrideH.toFixed(2)} m`);
    }
  }

  console.log(`波高: ${data.waveHeight.toFixed(2)} m`);
  console.log(`風速: ${data.windSpeed} m/s  風向: ${data.windDirection}`);
  console.log(`天気: ${data.weather}`);
  console.log(`日時: ${data.dateText}`);

  const text = buildText(data);
  console.log(`\nセリフ: 「${text}」`);
  console.log(`API: Cloud TTS  声: ja-JP-Neural2-D`);

  console.log("Cloud TTS で音声合成中...");
  const { wav, sampleRate } = await generateVoice(text);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(__dirname, "../public/voice.wav");
  fs.writeFileSync(outPath, wav);
  console.log(`保存完了: ${outPath}`);

  // 音声の長さを確認
  const byteRate = wav.readUInt32LE(28);
  const dataSize = wav.readUInt32LE(40);
  const durationSec = dataSize / byteRate;
  console.log(`音声の長さ: ${durationSec.toFixed(2)} 秒（サンプルレート: ${sampleRate} Hz）`);
  if (durationSec > 10) {
    console.warn(`⚠️  10秒を超えています（${durationSec.toFixed(2)}秒）`);
  } else {
    console.log(`✅ 10秒以内に収まっています`);
  }
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
