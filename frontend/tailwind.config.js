/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          bg: "#0B0F17",
          panel: "#111827",
          card: "#161F30",
          border: "#1F293D",
          hover: "#26354D",
          text: "#F1F5F9",
          muted: "#94A3B8",
          subtle: "#64748B"
        },
        aqi: {
          good: "#10B981",
          satisfactory: "#84CC16",
          moderate: "#EAB308",
          poor: "#F97316",
          verypoor: "#EF4444",
          severe: "#991B1B",
          emergency: "#701A75"
        },
        glow: {
          cyan: "rgba(6, 182, 212, 0.3)",
          amber: "rgba(245, 158, 11, 0.3)",
          red: "rgba(239, 68, 68, 0.35)",
          emerald: "rgba(16, 185, 129, 0.3)"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
