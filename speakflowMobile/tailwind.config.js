/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/presentation/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        card: "#18181b",
        border: "#27272a",
        primary: "#7c3aed",
        "primary-foreground": "#ffffff",
        secondary: "#3f3f46",
        muted: "#71717a",
        destructive: "#ef4444",
        success: "#10b981",
      },
    },
  },
  plugins: [],
};
