import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          coral: "#E76257",
          "coral-hover": "#D4544A",
          navy: "#1C2439",
          "navy-light": "#25304C",
          surface: "#F8F9FB",
          border: "#E8EAED",
          text: "#1C2439",
          muted: "#6B7280",
          success: "#10B981",
          warning: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
      },
      boxShadow: {
        skeuo: "0 1px 0 rgba(255,255,255,0.8) inset, 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        "skeuo-btn": "0 4px 14px rgba(231,98,87,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        recessed: "inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0 0 1px #E8EAED",
        "sidebar-depth": "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.15)",
      },
      backgroundImage: {
        "skeuo-card": "linear-gradient(180deg, #ffffff 0%, #f8f9fb 100%)",
        "sidebar-grad": "linear-gradient(180deg, #1e2847 0%, #1C2439 100%)",
        "btn-grad": "linear-gradient(135deg, #E76257 0%, #d4544a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
