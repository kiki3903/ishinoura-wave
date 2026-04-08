// fetch-wave.js — CLI 動作確認スクリプト
// node --experimental-strip-types src/fetch-wave.js

import { getSurfData } from "./getSurfData.ts";

const LAT = 34.22;
const LON = 135.16;
const TODAY = new Date().toISOString().slice(0, 10);

// 波高の一覧表示
const marineUrl =
  `https://marine-api.open-meteo.com/v1/marine` +
  `?latitude=${LAT}&longitude=${LON}` +
  `&hourly=wave_height` +
  `&start_date=${TODAY}&end_date=${TODAY}` +
  `&timezone=Asia%2FTokyo`;

const weatherUrl =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}&longitude=${LON}` +
  `&hourly=wind_speed_10m,wind_direction_10m` +
  `&wind_speed_unit=ms` +
  `&start_date=${TODAY}&end_date=${TODAY}` +
  `&timezone=Asia%2FTokyo`;

const [marineRes, weatherRes] = await Promise.all([fetch(marineUrl), fetch(weatherUrl)]);
if (!marineRes.ok) throw new Error(`Marine API HTTP ${marineRes.status}: ${await marineRes.text()}`);
if (!weatherRes.ok) throw new Error(`Weather API HTTP ${weatherRes.status}: ${await weatherRes.text()}`);

const marineData = await marineRes.json();
const weatherData = await weatherRes.json();

const times = marineData.hourly.time;
const heights = marineData.hourly.wave_height;
const winds = weatherData.hourly.wind_speed_10m;
const windDirs = weatherData.hourly.wind_direction_10m;
const nowHour = new Date().getHours();

const dirLabels = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
const toDirLabel = (deg) => dirLabels[Math.round(deg / 45) % 8];

console.log(`\n波・風情報（和歌山・磯ノ浦） ${TODAY}\n`);
console.log("時刻   波高      風速     風向");
console.log("─".repeat(36));
for (let i = 0; i < times.length; i++) {
  const time = times[i].slice(11, 16);
  const h = heights[i];
  const w = winds[i];
  const d = windDirs[i];
  const bar = h != null ? "█".repeat(Math.round(h * 4)) : "-";
  const marker = i === Math.min(nowHour, times.length - 1) ? " ← 現在" : "";
  console.log(
    `${time}  ${h != null ? h.toFixed(2) + "m" : "N/A  "}  ` +
    `${w != null ? w.toFixed(1) + "m/s" : "N/A  "}  ` +
    `${d != null ? toDirLabel(d).padEnd(3) : "N/A"}  ${bar}${marker}`
  );
}

const data = await getSurfData();
console.log(`\n✅ GrandpaWave に渡すデータ:`);
console.log(`   waveHeight:    ${data.waveHeight.toFixed(2)} m`);
console.log(`   windSpeed:     ${data.windSpeed} m/s`);
console.log(`   windDirection: ${data.windDirection}`);
console.log(`   dateText:      ${data.dateText}`);
