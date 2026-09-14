/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1d4e89',
          deep: '#14365f',
          ink: '#ffffff',
          accent: '#1f7a4d',
          accentDeep: '#155c39',
        },
        success: { bg: '#e3f2e7', ink: '#174e2e', line: '#6fae86' },
        warning: { bg: '#fdf0d5', ink: '#6b430a', line: '#c99a2e' },
        danger: { bg: '#fbe3e3', ink: '#7f1d22', line: '#cf7a7a' },
        surface: {
          page: '#eef1f5',
          card: '#ffffff',
          subtle: '#f5f8fb',
          inset: '#eaf0f6',
          border: '#c9d4e0',
          borderStrong: '#9db1c6',
        },
        notice: { bg: '#fdf3e0', line: '#9a6b14', ink: '#5c3d05' },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'Consolas', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(20,54,95,0.10)',
        md: '0 2px 8px rgba(20,54,95,0.12)',
        lg: '0 8px 24px rgba(20,54,95,0.16)',
      },
    },
  },
  plugins: [],
}
