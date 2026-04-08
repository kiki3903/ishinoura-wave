const LAT = 34.22;
const LON = 135.16;

export async function getWaveHeight(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&hourly=wave_height` +
    `&start_date=${today}&end_date=${today}` +
    `&timezone=Asia%2FTokyo`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Marine API error: HTTP ${res.status}`);

  const data = await res.json();
  const heights: (number | null)[] = data.hourly.wave_height;
  const nowHour = Math.min(new Date().getHours(), heights.length - 1);
  return heights[nowHour] ?? 0;
}
