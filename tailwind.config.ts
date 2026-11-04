import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kinford: {
          maroon: "#A22538",
          maroonDark: "#851b2c",
          maroonLight: "#FFF1F3",
          gold: "#EEB540",
          goldLight: "#FEF7E8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
