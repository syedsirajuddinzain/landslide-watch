/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#30d158',
          moderate: '#ffd60a',
          high: '#ff9f0a',
          critical: '#ff453a',
        },
        brand: {
          pine: '#0F2018',     // Deep Forest Pine
          forest: '#1A3028',   // Forest Canopy
          DEFAULT: '#4A7C59',  // Sage Evergreen Accent
          light: '#7FB99A',   // Mint Leaf Accent
          mist: '#C8D8BC',    // Sage Mist Tint
          dark: '#1A3028',
          accent: '#4A7C59',
        },
        surface: {
          DEFAULT: '#F5F0E8',  // Warm Natural Canvas
          card: '#FFFFFF',     // Crisp White Card
          elevated: '#FFFFFF', // Elevated Dialog
          border: '#C8D8BC',   // Sage Mist Divider
          muted: '#1A3028',    // Deep Forest Text
        },
        text: {
          primary: '#0F2018',  // Deep Forest Pine
          secondary: '#1A3028',// Forest Canopy
          muted: '#4A7C59',    // Sage Accent
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"SF Mono"', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
