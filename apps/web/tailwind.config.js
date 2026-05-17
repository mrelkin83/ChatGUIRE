/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EDEDF0",
        secondary: "#8A8A9B",
        muted: "#56566A",
        accent: {
          blue:    "#3B82F6",
          amber:   "#F59E0B",
          green:   "#10B981",
          red:     "#EF4444",
          purple:  "#8B5CF6",
        },
        surface: {
          root:    "#0A0A0F",
          DEFAULT: "#111118",
          raised:  "#18181F",
          high:    "#1E1E28",
        },
        border: {
          subtle:  "rgba(255,255,255,0.06)",
          default: "rgba(255,255,255,0.09)",
          strong:  "rgba(255,255,255,0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease",
        "fade-in-up": "fadeInUp 0.3s ease",
        "slide-up":   "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "scale(0.96) translateY(10px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
