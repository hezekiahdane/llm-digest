import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        "inspection-card-glow": '4px 6px 10px rgba(0, 60, 197, 0.2), inset 0 0 20px rgba(106, 200, 255, 0.2)',
      },
      screens: {
        '3xl': '1920px',
        md: '768px',
        lg: '1440px',
        xl: '1920px'
      },
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
          DEFAULT: 'hsl(var(--primary))', // fallback
          foreground: 'hsl(var(--primary-foreground))',
          semantic: 'var(--color-primary)',
        },
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
          950: 'var(--accent-950)',
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        header: {
          DEFAULT: 'var(--color-header)',
          accent: 'var(--color-header-accent)',
        },
        body: 'var(--color-body)',
        tag: 'var(--color-tag)',
        nav: 'var(--color-nav)',
        wdBlue: 'var(--color-wd-blue)',
        wdOrange: 'var(--color-wd-orange)',
        cbGreen: 'var(--color-cb-green)',
        cmGreen: 'var(--color-cm-green)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      padding: {
        relaxed: 'var(--padding-x-relaxed)',
        tight: 'var(--padding-x-tight)',
        navbar: 'var(--padding-y-navbar)',
        footer: 'var(--padding-y-footer)',
        hero: 'var(--padding-y-hero)',
      },
      spacing: {
        relaxed: 'var(--padding-x-relaxed)',
        tight: 'var(--padding-x-tight)',
        navbar: 'var(--padding-y-navbar)',
        footer: 'var(--padding-y-footer)',
        hero: 'var(--padding-y-hero)',
      },
      fontSize: {
        h1: [
          'var(--text-h1-size)',
          {
            lineHeight: 'var(--text-h1-height)',
          },
        ],
        h2: [
          'var(--text-h2-size)',
          {
            lineHeight: 'var(--text-h2-height)',
          },
        ],
        h3: [
          'var(--text-h3-size)',
          {
            lineHeight: 'var(--text-h3-height)',
          },
        ],
        h4: [
          'var(--text-h4-size)',
          {
            lineHeight: 'var(--text-h4-height)',
          },
        ],
        h5: [
          'var(--text-h5-size)',
          {
            lineHeight: 'var(--text-h5-height)',
          },
        ],
        h6: [
          'var(--text-h6-size)',
          {
            lineHeight: 'var(--text-h6-height)',
          },
        ],
        'body-lg': [
          'var(--body-lg-size)',
          {
            lineHeight: 'var(--body-lg-height)',
          },
        ],
        'body-md': [
          'var(--body-md-size)',
          {
            lineHeight: 'var(--body-md-height)',
          },
        ],
        'body-sm': [
          'var(--body-sm-size)',
          {
            lineHeight: 'var(--body-sm-height)',
          },
        ],
        caption: [
          'var(--caption-size)',
          {
            lineHeight: 'var(--caption-height)',
          },
        ],
        tagText: [
          'var(--tag-size)',
          {
            lineHeight: 'var(--tag-height)',
            letterSpacing: 'var(--tag-letter-spacing)',
          },
        ],
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        caption: ['var(--font-caption)', 'sans-serif'],
        gilroy: ['var(--font-gilroy)', 'sans-serif'],
      },
      borderRadius: {
        '5xl': 'var(--radius)',
        '4xl': 'calc(var(--radius) - 24px)',
        '3xl': 'calc(var(--radius) - 26px)',
        '2xl': 'calc(var(--radius) - 28px)',
        xl: 'calc(var(--radius) - 30px)',
        lg: 'calc(var(--radius) - 32px)',
        md: 'calc(var(--radius) - 34px)',
        sm: 'calc(var(--radius) - 36px)',
      },
      keyframes: {
        'fade-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out',
        'fade-up-1': 'fade-up 0.5s ease-out 0s',
        'fade-up-2': 'fade-up 0.5s ease-out 0.1s',
        'fade-up-3': 'fade-up 0.5s ease-out 0.2s',
        'fade-up-4': 'fade-up 0.5s ease-out 0.3s',
        'fade-up-5': 'fade-up 0.5s ease-out 0.4s',
        'fade-up-6': 'fade-up 0.5s ease-out 0.5s',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
