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
        <div
          style={{
            alignItems: "center",
            background: "#17130E",
            border: "8px solid #4A3520",
            borderRadius: 120,
            display: "flex",
            height: 390,
            justifyContent: "center",
            width: 390,
          }}
        >
          <svg width="280" height="280" viewBox="0 0 280 280">
            <path d="M140 12c9 67 61 119 128 128-67 9-119 61-128 128-9-67-61-119-128-128 67-9 119-61 128-128Z" fill="#D89C56" />
            <path d="M224 22c3 25 22 44 47 47-25 3-44 22-47 47-3-25-22-44-47-47 25-3 44-22 47-47Z" fill="#E06B52" />
            <circle cx="53" cy="225" r="18" fill="#9CAF76" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
