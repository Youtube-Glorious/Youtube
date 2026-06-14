import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#787FFF", // 보라 (포인트)
          dark: "#5a61e6",
          light: "#ECEDFF",
        },
        shorts: {
          DEFAULT: "#FFF787", // 쇼츠 노랑
          ink: "#7a6a00",
          light: "#FFFCDB",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(120,127,255,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
