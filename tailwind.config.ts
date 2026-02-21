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
        pe: {
          bg: "#1a1a1a",
          surface: "#242424",
          elevated: "#2a2a2a",
          text: "#f5f5f5",
          "text-secondary": "#a0a0a0",
          "text-muted": "#707070",
          accent: "#8fbc8f",
          "accent-hover": "#7aab7a",
          border: "#333333",
          "border-subtle": "#2a2a2a",
          "tag-dietary-bg": "#3d2028",
          "tag-dietary": "#f4a0b0",
          "tag-allergen-bg": "#3d3520",
          "tag-allergen": "#f0c060",
          "tag-macro-bg": "#1a3030",
          "tag-macro": "#60c0b0",
          "tag-rank-bg": "#3d3520",
          "tag-rank": "#d4a030",
          "tag-spice-bg": "#3d2020",
          "tag-spice": "#f06040",
          "badge-protein": "#e05050",
          "badge-vegetable": "#50b050",
          "badge-sauce": "#e08030",
          "badge-carb": "#d0c040",
        },
      },
    },
  },
  plugins: [],
};
export default config;
