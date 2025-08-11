
import { type Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Futuristic theme colors
        futuristic: {
          primary: "hsl(217, 100%, 60%)",
          secondary: "hsl(271, 100%, 65%)",
          accent: "hsl(193, 100%, 50%)",
          neon: "hsl(286, 85%, 55%)",
          electric: "hsl(203, 92%, 60%)",
          hologram: "hsl(310, 90%, 70%)",
        },
        // Plan colors
        plan: {
          free: "hsl(220, 8%, 46%)",
          vip: "hsl(217, 100%, 60%)",
          pro: "hsl(271, 100%, 65%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(79, 70, 229, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(79, 70, 229, 0.8)" },
        },
        "magnetic": {
          "0%": { transform: "translateX(0) translateY(0)" },
          "25%": { transform: "translateX(2px) translateY(-2px)" },
          "50%": { transform: "translateX(-2px) translateY(2px)" },
          "75%": { transform: "translateX(2px) translateY(2px)" },
          "100%": { transform: "translateX(0) translateY(0)" },
        },
        "particle": {
          "0%": { transform: "translateY(100vh) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(-100vh) rotate(360deg)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "magnetic": "magnetic 4s ease-in-out infinite",
        "particle": "particle 15s linear infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'futuristic-gradient': 'linear-gradient(135deg, hsl(217, 100%, 60%) 0%, hsl(271, 100%, 65%) 50%, hsl(193, 100%, 50%) 100%)',
        'magnetic-field': 'radial-gradient(ellipse at center, rgba(79, 70, 229, 0.3) 0%, rgba(79, 70, 229, 0.1) 50%, transparent 70%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
