import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF8F5",
        paper: "#F3EFE6",
        ink: {
          DEFAULT: "#1F2923",
          light: "#4B5563",
          muted: "#9CA3AF",
        },
        emerald: {
          DEFAULT: "#1F4B36",
          light: "#E8F3EE",
          dark: "#143324",
        },
        amber: {
          DEFAULT: "#D98936",
          light: "#FDF5EA",
          dark: "#A5641F",
        },
        slateblue: {
          DEFAULT: "#3B5973",
          light: "#EBF1F5",
          dark: "#273C4E",
        },
      },
      fontFamily: {
        display: ["var(--font-baloo)", "Inter", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        olchiki: ["var(--font-olchiki)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        modal: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
