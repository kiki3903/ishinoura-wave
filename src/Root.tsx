import React from "react";
import { Composition } from "remotion";
import { GrandpaWave } from "./GrandpaWave";
import { getSurfData } from "./getSurfData";

export const Root: React.FC = () => {
  return (
    <Composition
      id="GrandpaWave"
      component={GrandpaWave}
      defaultProps={{
        waveHeight: 0,
        windSpeed: 0,
        windDirection: "北",
        dateText: "4月8日朝5時",
        weather: "快晴",
      }}
      calculateMetadata={async ({ props }) => {
        // --props で値が渡された場合はそのまま使う
        // defaultProps の waveHeight=0 のときのみ API から取得（プレビュー用）
        if (props.waveHeight !== 0) {
          console.log(`[Root] using passed props: waveHeight=${props.waveHeight} dateText=${props.dateText}`);
          return { props };
        }
        const data = await getSurfData();
        console.log(`[Root] waveHeight: ${data.waveHeight.toFixed(2)} m`);
        console.log(`[Root] windSpeed: ${data.windSpeed} m/s  windDirection: ${data.windDirection}`);
        console.log(`[Root] dateText: ${data.dateText}`);
        return { props: data };
      }}
      durationInFrames={300}
      fps={30}
      width={480}
      height={832}
    />
  );
};
