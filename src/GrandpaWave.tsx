import { Audio } from "@remotion/media";
import { OffthreadVideo, staticFile } from "remotion";

type Props = {
  waveHeight: number;
  windSpeed: number;
  windDirection: string;
  dateText: string;
  weather: string;
};

function getVideoFile(h: number): string {
  if (h < 0.4) return "grandpa_sune.mp4";
  if (h < 0.6) return "grandpa_hiza.mp4";
  if (h < 0.8) return "grandpa_momo.mp4";
  if (h < 1.0) return "grandpa_koshi.mp4";
  if (h < 1.2) return "grandpa_hara.mp4";
  if (h < 1.4) return "grandpa_mune.mp4";
  if (h < 1.6) return "grandpa_kata.mp4";
  return "grandpa_atama.mp4";
}

function getWaveLabel(h: number): string {
  if (h < 0.4) return "スネ";
  if (h < 0.6) return "ヒザ";
  if (h < 0.8) return "モモ";
  if (h < 1.0) return "コシ";
  if (h < 1.2) return "ハラ";
  if (h < 1.4) return "ムネ";
  if (h < 1.6) return "カタ";
  return "アタマ";
}

export const GrandpaWave: React.FC<Props> = ({
  waveHeight,
  windSpeed,
  windDirection,
  dateText,
  weather,
}) => {
  const videoFile = getVideoFile(waveHeight);
  const waveLabel = getWaveLabel(waveHeight);

  const subtitle =
    `${dateText}の磯ノ浦は${weather} 風速${windSpeed}m${windDirection}風　` +
    `波は${waveLabel}（${waveHeight.toFixed(2)}m）皆さんご安全に！`;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      <Audio src={staticFile("voice.wav")} />
      <OffthreadVideo
        src={staticFile(videoFile)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 16,
          right: 16,
          textAlign: "center",
          color: "#fff",
          fontSize: 40,
          fontWeight: "bold",
          fontFamily: "sans-serif",
          lineHeight: 1.5,
          textShadow:
            "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000," +
            "-3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000",
          letterSpacing: "0.03em",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
