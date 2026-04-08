import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const HelloRemotion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        backgroundColor: "#1a73e8",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          opacity,
          color: "#ffffff",
          fontSize: 120,
          fontFamily: "sans-serif",
          margin: 0,
        }}
      >
        Hello Remotion!
      </h1>
    </div>
  );
};
