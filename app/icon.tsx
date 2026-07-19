import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#090B0A",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg width="420" height="420" viewBox="0 0 1024 1024">
          <path
            d="M 350,760 Q 300,520 512,300 Q 724,520 674,760"
            fill="none"
            stroke="#F2EBDD"
            strokeWidth="98"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="512" cy="566" r="56" fill="#D89C56" />
        </svg>
      </div>
    ),
    size,
  );
}
