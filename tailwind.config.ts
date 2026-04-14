import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'heading-1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading-2': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-3': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-4': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.375rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'caption': ['0.75rem', { lineHeight: '1rem' }],
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        stage: {
          1: "hsl(var(--stage-1))",
          2: "hsl(var(--stage-2))",
          3: "hsl(var(--stage-3))",
          4: "hsl(var(--stage-4))",
          5: "hsl(var(--stage-5))",
          6: "hsl(var(--stage-6))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
      fontFamily: {
        sans: ["NotionInter", "Inter", "ui-sans-serif", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        heading: ["Be Vietnam Pro", "NotionInter", "Inter", "sans-serif"],
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-in-bounce": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "lightbox-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "progress-bar": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        "skeleton-wave": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in-down": "fade-in-down 0.4s ease-out forwards",
        "fade-in-left": "fade-in-left 0.5s ease-out forwards",
        "fade-in-right": "fade-in-right 0.5s ease-out forwards",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-in-bounce": "scale-in-bounce 0.5s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "lightbox-in": "lightbox-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "spin-slow": "spin-slow 2s linear infinite",
        "progress-bar": "progress-bar 1.5s ease-in-out infinite",
        "skeleton-wave": "skeleton-wave 1.8s ease-in-out infinite",
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'elevated': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.04)',
        'dropdown': 'var(--notion-shadow-popup)',
        'modal': '0 24px 48px -12px rgb(0 0 0 / 0.18), 0 0 0 1px rgb(0 0 0 / 0.05)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'inset': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
      },
      transitionDuration: {
        'micro': '100ms',
        'fast': '150ms',
        'normal': '200ms',
        'smooth': '300ms',
        'slow': '500ms',
      },
      transitionTimingFunction: {
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;