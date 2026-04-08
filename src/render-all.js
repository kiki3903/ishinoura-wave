/**
 * render-all.js — 8パターンの動画を一括生成するスクリプト
 *
 * 各パターンごとに：
 *   1. props JSON を書き出す
 *   2. VOICEVOX で voice.wav を生成
 *   3. npx remotion render でレンダリング
 *
 * 使い方:
 *   node --experimental-strip-types src/render-all.js
 *
 * VOICEVOX が localhost:50021 で起動している必要があります。
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output");

const PATTERNS = [
  { part: "sune",  waveHeight: 0.2, windSpeed: 2.1, windDirection: "北",   weather: "快晴",      dateText: "4月8日 朝6時"   },
  { part: "hiza",  waveHeight: 0.5, windSpeed: 3.2, windDirection: "北東", weather: "晴れ",      dateText: "4月8日 朝7時"   },
  { part: "momo",  waveHeight: 0.7, windSpeed: 4.1, windDirection: "東",   weather: "晴れ時々曇り", dateText: "4月8日 朝8時" },
  { part: "koshi", waveHeight: 0.9, windSpeed: 5.3, windDirection: "南東", weather: "曇り",      dateText: "4月8日 昼11時"  },
  { part: "hara",  waveHeight: 1.1, windSpeed: 6.2, windDirection: "南",   weather: "曇り",      dateText: "4月8日 昼13時"  },
  { part: "mune",  waveHeight: 1.3, windSpeed: 7.4, windDirection: "南西", weather: "小雨",      dateText: "4月8日 夕方16時" },
  { part: "kata",  waveHeight: 1.5, windSpeed: 8.1, windDirection: "西",   weather: "雨",        dateText: "4月8日 夜19時"  },
  { part: "atama", waveHeight: 1.7, windSpeed: 9.3, windDirection: "北西", weather: "雷雨",      dateText: "4月8日 夜21時"  },
];

const results = [];

for (const props of PATTERNS) {
  const { part, waveHeight } = props;

  console.log(`\n${"=".repeat(52)}`);
  console.log(` [${part.toUpperCase()}]  waveHeight=${waveHeight}m  ${props.dateText}  ${props.weather}`);
  console.log("=".repeat(52));

  // ① props JSON を書き出す
  const propsPath = path.join(outputDir, `props_${part}.json`);
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  console.log(`\n① props 書き出し: ${propsPath}`);

  // ② VOICEVOX で voice.wav を生成
  console.log(`\n② voice.wav を生成中...`);
  execSync(
    `node --experimental-strip-types src/generate-voice.js output/props_${part}.json`,
    { cwd: rootDir, stdio: "inherit" }
  );

  // ③ remotion render
  console.log(`\n③ レンダリング中 → output/output_${part}.mp4`);
  execSync(
    `npx remotion render GrandpaWave output/output_${part}.mp4 --props=output/props_${part}.json`,
    { cwd: rootDir, stdio: "inherit" }
  );

  const outFile = path.join(outputDir, `output_${part}.mp4`);
  const sizeMB = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ output_${part}.mp4 完成（${sizeMB} MB）`);
  results.push({ part, waveHeight, sizeMB });
}

console.log(`\n${"=".repeat(52)}`);
console.log(" 全パターン完了");
console.log("=".repeat(52));
for (const r of results) {
  console.log(`  ${r.part.padEnd(6)} waveHeight=${r.waveHeight}m → output_${r.part}.mp4 (${r.sizeMB} MB)`);
}
