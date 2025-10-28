// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        myfont: ['Tenada'], // MyFont 등록
      },
    },
  },
  plugins: [],
}
