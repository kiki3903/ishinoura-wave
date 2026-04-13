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

function formatDateText(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  let timeOfDay: string;
  if (hour < 5) timeOfDay = "深夜";
  else if (hour <= 10) timeOfDay = "朝";
  else if (hour <= 15) timeOfDay = "昼";
  else if (hour <= 18) timeOfDay = "夕方";
  else timeOfDay = "夜";
  return `${month}月${day}日${timeOfDay}${hour}時`;
}

// 月齢から潮周りを計算
function getTideType(date: Date): string {
  const known = new Date("2000-01-06T18:14:00Z"); // 既知の新月
  const lunarCycle = 29.530588853;
  const diffDays = (date.getTime() - known.getTime()) / 86400000;
  const age = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
  if (age <= 1.5 || age >= 28) return "大潮";
  if (age <= 4) return "中潮";
  if (age <= 6) return "小潮";
  if (age <= 7) return "長潮";
  if (age <= 8) return "若潮";
  if (age <= 11) return "中潮";
  if (age <= 13) return "大潮";
  if (age <= 15.5) return "大潮";
  if (age <= 18) return "中潮";
  if (age <= 20) return "小潮";
  if (age <= 21) return "長潮";
  if (age <= 22) return "若潮";
  if (age <= 25) return "中潮";
  return "大潮";
}

// 気象庁潮汐データ取得（和歌山港）
async function getTideData(date: Date): Promise<{ kocho: string; mancho: string }> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/WK.txt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("JMA fetch failed");
    const text = await res.text();
    const lines = text.split("\n");
    const target = `${year}${month}${day}`;
    for (const line of lines) {
      if (line.startsWith(target)) {
        // フォーマット: YYYYMMDD HH:MM L HH:MM H HH:MM L HH:MM H ...
        const parts = line.trim().split(/\s+/);
        const times: { time: string; type: string }[] = [];
        for (let i = 1; i + 1 < parts.length; i += 2) {
          times.push({ time: parts[i], type: parts[i + 1] });
        }
        const kocho = times.find(t => t.type === "L")?.time ?? "--:--";
        const mancho = times.find(t => t.type === "H")?.time ?? "--:--";
        return { kocho, mancho };
      }
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
  weather: string;
  tideType: string;
  kocho: string;
  mancho: string;
};

export async function getSurfData(): Promise<SurfData> {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const idx = Math.min(now.getHours(), 23);

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
    dateText: formatDateText(now),
    weather: weatherCodeToJapanese(weatherCode),
    tideType: getTideType(now),
    kocho: tideData.kocho,
    mancho: tideData.mancho,
  };
}
