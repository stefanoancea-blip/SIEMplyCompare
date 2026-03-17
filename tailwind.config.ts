import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nav: "#0c1222",
        primary: {
          DEFAULT: "#0066cc",
          hover: "#0052a3",
          foreground: "#ffffff",
        },
        content: {
          bg: "#ffffff",
          "bg-muted": "#f5f6f8",
          foreground: "#171717",
          muted: "#4b5563",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
