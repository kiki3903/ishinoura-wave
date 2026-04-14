const LAT = 34.22;
const LON = 135.16;

function degreesToJapanese(deg: number): string {
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  return dirs[Math.round(deg / 45) % 8];
}

function weatherCodeToJapanese(code: number): string {
  if (code === 0) return "快晴";
  if (code === 1) return "晴れ";
  if (code === 2) return "晴れ時々曇り";
  if (code === 3) return "曇り";
  if (code <= 48) return "霧";
  if (code <= 55) return "霧雨";
  if (code <= 65) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "にわか雨";
  if (code <= 86) return "にわか雪";
  return "雷雨";
}

function formatDateText(jst: Date): string {
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  let timeOfDay: string;
  if (hour < 5) timeOfDay = "深夜";
  else if (hour <= 10) timeOfDay = "朝";
  else if (hour <= 15) timeOfDay = "昼";
  else if (hour <= 18) timeOfDay = "夕方";
  else timeOfDay = "夜";
  return `${month}月${day}日${timeOfDay}${hour}時`;
}

function formatDateTextDetail(jst: Date): string {
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  let timeOfDay: string;
  if (hour < 5) timeOfDay = "深夜";
  else if (hour <= 10) timeOfDay = "朝";
  else if (hour <= 15) timeOfDay = "昼";
  else if (hour <= 18) timeOfDay = "夕方";
  else timeOfDay = "夜";
  return `${month}月${day}日${timeOfDay}${hour}時${min}分`;
}

function getTideType(date: Date): string {
  const known = new Date("2000-01-06T18:14:00Z");
  const lunarCycle = 29.530588853;
  const diffDays = (date.getTime() - known.getTime()) / 86400000;
  const age = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
  if (age <= 2) return "大潮";
  if (age <= 4) return "中潮";
  if (age <= 5.5) return "小潮";
  if (age <= 6.5) return "長潮";
  if (age <= 8) return "若潮";
  if (age <= 11) return "中潮";
  if (age <= 16) return "大潮";
  if (age <= 18) return "中潮";
  if (age <= 19.5) return "小潮";
  if (age <= 20.5) return "長潮";
  if (age <= 22) return "若潮";
  if (age <= 27) return "中潮";
  if (age <= 29.5) return "大潮";
  return "大潮";
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findNearest(tides: { time: string; height: number }[], currentMinutes: number, type: "low" | "high"): string {
  const sorted = tides
    .filter(t => type === "low" ? t.height <= 100 : t.height >= 120)
    .sort((a, b) => {
      const da = Math.abs(timeStrToMinutes(a.time) - currentMinutes);
      const db = Math.abs(timeStrToMinutes(b.time) - currentMinutes);
      return da - db;
    });
  return sorted[0]?.time ?? "--:--";
}

async function getTideData(date: Date): Promise<{ kocho: string; mancho: string }> {
  try {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const mm = String(jst.getUTCMonth() + 1);
    const dd = String(jst.getUTCDate()).padStart(2, "0");
    const currentMinutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
    const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/TK.txt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("JMA fetch failed");
    const text = await res.text();
    const yy = String(year).slice(2);
    const target = `${yy} ${mm}${dd}TK`;

    for (const line of text.split("\n")) {
      if (!line.includes(target)) continue;
      const idx = line.indexOf(target) + target.length;
      const rest = line.slice(idx);
      const allTides: { time: string; height: number }[] = [];

      for (const block of rest.split(/9{5,}/).map(b => b.trim()).filter(Boolean)) {
        const parts = block.split(/\s+/).filter(p => p && !/^9+$/.test(p));
        let i = 0;
        while (i < parts.length) {
          const part = parts[i];
          const val = parseInt(part);
          if (part.length <= 2 && val >= 0 && val <= 23 && i + 1 < parts.length) {
            const next = parts[i + 1];
            if (next.length >= 4) {
              const mTens = parseInt(next[0]);
              const height = parseInt(next.slice(1, 4));
              if (mTens >= 0 && mTens <= 5 && height >= 0 && height <= 350) {
                allTides.push({
                  time: `${String(val).padStart(2, "0")}:${String(mTens * 10).padStart(2, "0")}`,
                  height,
                });
                i += 2;
                if (next.length > 4) {
                  const embHour = parseInt(next.slice(4));
                  if (embHour >= 0 && embHour <= 23 && i < parts.length) {
                    const next2 = parts[i];
                    if (next2.length >= 4) {
                      const m2 = parseInt(next2[0]);
                      const h2 = parseInt(next2.slice(1, 4));
                      if (m2 >= 0 && m2 <= 5 && h2 >= 0 && h2 <= 350) {
                        allTides.push({
                          time: `${String(embHour).padStart(2, "0")}:${String(m2 * 10).padStart(2, "0")}`,
                          height: h2,
                        });
                        i++;
                      }
                    }
                  }
                }
                continue;
              }
            }
          }
          if (part.length === 3) {
            const h = parseInt(part[0]);
            const m = parseInt(part.slice(1));
            if (h >= 1 && h <= 9 && m >= 0 && m <= 59 && i + 1 < parts.length) {
              const height = parseInt(parts[i + 1]);
              if (height >= 0 && height <= 350) {
                allTides.push({ time: `0${part[0]}:${part.slice(1)}`, height });
                i += 2; continue;
              }
            }
          }
          if (part.length === 4) {
            const h = parseInt(part.slice(0, 2));
            const m = parseInt(part.slice(2));
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && i + 1 < parts.length) {
              const height = parseInt(parts[i + 1]);
              if (height >= 0 && height <= 350) {
                allTides.push({ time: `${part.slice(0, 2)}:${part.slice(2)}`, height });
                i += 2; continue;
              }
            }
          }
          if (part.length > 4) {
            let pos = 0;
            while (pos < part.length - 2) {
              let timeStr = "", skipLen = 0;
              if (pos + 4 <= part.length) {
                const h = parseInt(part.slice(pos, pos + 2));
                const m = parseInt(part.slice(pos + 2, pos + 4));
                if (h >= 10 && h <= 23 && m >= 0 && m <= 59) {
                  timeStr = `${part.slice(pos, pos + 2)}:${part.slice(pos + 2, pos + 4)}`;
                  skipLen = 4;
                }
              }
              if (!timeStr && pos + 3 <= part.length) {
                const h = parseInt(part[pos]);
                const m = parseInt(part.slice(pos + 1, pos + 3));
                if (h >= 1 && h <= 9 && m >= 0 && m <= 59) {
                  timeStr = `0${part[pos]}:${part.slice(pos + 1, pos + 3)}`;
                  skipLen = 3;
                }
              }
              if (!timeStr) { pos++; continue; }
              pos += skipLen;
              let pushed = false;
              for (const hlen of [3, 2]) {
                if (pos + hlen <= part.length) {
                  const h = parseInt(part.slice(pos, pos + hlen));
                  if (h >= 0 && h <= 350) {
                    allTides.push({ time: timeStr, height: h });
                    pos += hlen; pushed = true; break;
                  }
                }
              }
              if (!pushed) pos++;
            }
          }
          i++;
        }
      }

      if (allTides.length < 2) break;
      console.log(`  潮汐データ: ${JSON.stringify(allTides)}`);
      const kocho = findNearest(allTides, currentMinutes, "low");
      const mancho = findNearest(allTides, currentMinutes, "high");
      return { kocho, mancho };
    }
  } catch (e) {
    console.error("潮汐データ取得エラー:", e);
  }
  return { kocho: "--:--", mancho: "--:--" };
}

export type SurfData = {
  waveHeight: number;
  windSpeed: number;
  windDirection: string;
  dateText: string;
  dateTextDetail: string;
  weather: string;
  tideType: string;
  kocho: string;
  mancho: string;
};

export async function getSurfData(): Promise<SurfData> {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = jst.toISOString().slice(0, 10);
  const idx = Math.min(jst.getUTCHours(), 23);

  const [marineRes, weatherRes, tideData] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=wave_height` +
        `&start_date=${today}&end_date=${today}` +
        `&timezone=Asia%2FTokyo`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=wind_speed_10m,wind_direction_10m,weather_code` +
        `&wind_speed_unit=ms` +
        `&start_date=${today}&end_date=${today}` +
        `&timezone=Asia%2FTokyo`
    ),
    getTideData(now),
  ]);

  if (!marineRes.ok) throw new Error(`Marine API error: HTTP ${marineRes.status}`);
  if (!weatherRes.ok) throw new Error(`Weather API error: HTTP ${weatherRes.status}`);

  const marineData = await marineRes.json();
  const weatherData = await weatherRes.json();

  const waveHeight: number = marineData.hourly.wave_height[idx] ?? 0;
  const windSpeedRaw: number = weatherData.hourly.wind_speed_10m[idx] ?? 0;
  const windDeg: number = weatherData.hourly.wind_direction_10m[idx] ?? 0;
  const weatherCode: number = weatherData.hourly.weather_code[idx] ?? 0;

  return {
    waveHeight,
    windSpeed: Math.round(windSpeedRaw * 10) / 10,
    windDirection: degreesToJapanese(windDeg),
    dateText: formatDateText(jst),
    dateTextDetail: formatDateTextDetail(jst),
    weather: weatherCodeToJapanese(weatherCode),
    tideType: getTideType(now),
    kocho: tideData.kocho,
    mancho: tideData.mancho,
  };
}
