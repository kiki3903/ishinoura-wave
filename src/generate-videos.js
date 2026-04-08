/**
 * surfing_grandpa.mp4 から波高パターン別の動画を生成するスクリプト。
 *
 * 戦略:
 *   colorbalance の「ミッドトーン」(rm/gm/bm) だけを操作することで
 *   肌色（中間輝度・中彩度）を主に変化させる。
 *   - 白髪 → ハイライト領域 → rm/gm/bm では殆ど変化しない
 *   - サーフパンツ → 既に高彩度 → eq saturation 増でも変化幅が小さい
 *
 * 使い方:
 *   node src/generate-videos.js
 *
 * ffmpeg がシステムに入っている必要があります。
 */

import { spawnSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const input = path.join(publicDir, "surfing_grandpa.mp4");

// ── フィルター定義 ──────────────────────────────────────────────
//
// colorbalance パラメータ: -1.0 〜 1.0
//   rm/gm/bm = ミッドトーンの R/G/B 増減（肌色が主に反応）
//   rs/gs/bs = ハイライトの R/G/B（白髪への影響を避けるため触らない）
//   rl/gl/bl = シャドウの R/G/B（暗部への影響を避けるため触らない）
//
// eq パラメータ:
//   saturation = 全体彩度 (0.0〜3.0, デフォルト 1.0)
//   brightness = 全体輝度 (-1.0〜1.0, デフォルト 0.0)
//
const variants = [
  {
    output: "grandpa_gray.mp4",
    label: "白い肌（明るく白っぽい）",
    // ミッドトーンから暖色を抜いて + 彩度を大幅カット → 肌が白っぽくなる
    // 白髪はもともと無彩色なので変化なし
    filter:
      "colorbalance=rm=-0.40:gm=-0.15:bm=0.05,eq=saturation=0.3:brightness=0.06",
  },
  {
    output: "grandpa_warm.mp4",
    label: "薄茶色の肌",
    // ミッドトーンにごく控えめな暖色を加える（原版に近い）
    filter: "colorbalance=rm=0.12:gm=0.00:bm=-0.10",
  },
  {
    output: "grandpa_orange.mp4",
    label: "茶色の肌",
    // ミッドトーンを強めに暖色シフト + 彩度 1.2 倍
    filter:
      "colorbalance=rm=0.32:gm=0.06:bm=-0.28,eq=saturation=1.2",
  },
  {
    output: "grandpa_red.mp4",
    label: "真っ赤な肌",
    // ミッドトーンを赤方向へ最大級にシフト
    filter:
      "colorbalance=rm=0.48:gm=-0.12:bm=-0.30,eq=saturation=1.35",
  },
  {
    output: "grandpa_gold.mp4",
    label: "金色に輝く肌",
    // 赤+やや緑（黄金色）＋青カット + 彩度・輝度アップでグロー感
    filter:
      "colorbalance=rm=0.42:gm=0.20:bm=-0.32,eq=saturation=1.50:brightness=0.08",
  },
];

// ── ffmpeg 実行ヘルパー ────────────────────────────────────────
function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.error) {
    throw new Error(`ffmpeg の起動に失敗しました: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg がエラーで終了しました:\n${result.stderr}`);
  }
}

// ── メイン ────────────────────────────────────────────────────
async function main() {
  if (!existsSync(input)) {
    console.error(`入力ファイルが見つかりません: ${input}`);
    process.exit(1);
  }

  console.log(`入力: ${input}\n`);

  for (const v of variants) {
    const outputPath = path.join(publicDir, v.output);
    console.log(`[${v.label}] 生成中...`);
    console.log(`  フィルター: ${v.filter}`);

    runFfmpeg([
      "-y",             // 既存ファイルを上書き
      "-i", input,
      "-vf", v.filter,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "23",
      "-preset", "fast",
      "-c:a", "copy",   // 音声はそのままコピー
      outputPath,
    ]);

    console.log(`  → 保存: ${outputPath}\n`);
  }

  console.log("✓ 全パターンの生成が完了しました！");
  console.log("生成ファイル:");
  for (const v of variants) {
    console.log(`  public/${v.output}  (${v.label})`);
  }
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
