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
        primary: "#f1f1f4",
        secondary: "#8b8b9e",
        muted: "#5a5a6e",
        accent: {
          amber: "#f59e0b",
          blue: "#3b82f6",
          green: "#22c55e",
          red: "#ef4444",
          purple: "#8b5cf6",
          pink: "#ec4899",
        },
        surface: {
          root: "#07070a",
          DEFAULT: "#0f0f16",
          elevated: "#161622",
          card: "rgba(22, 22, 34, 0.7)",
        },
        border: {
          subtle: "#252536",
          hover: "#36364a",
        },
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "card": "16px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "fade-in-up": "fadeInUp 0.3s ease",
        "slide-up": "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "scale(0.96) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
}
