import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pe: {
          bg: "var(--pe-bg)",
          surface: "var(--pe-surface)",
          elevated: "var(--pe-elevated)",
          text: "var(--pe-text)",
          "text-secondary": "var(--pe-text-secondary)",
          "text-muted": "var(--pe-text-muted)",
          accent: "var(--pe-accent)",
          "accent-hover": "var(--pe-accent-hover)",
          teal: "var(--pe-teal)",
          amber: "var(--pe-amber)",
          border: "var(--pe-border)",
          "border-subtle": "var(--pe-border-subtle)",
          "tag-dietary-bg": "var(--pe-tag-dietary-bg)",
          "tag-dietary": "var(--pe-tag-dietary)",
          "tag-allergen-bg": "var(--pe-tag-allergen-bg)",
          "tag-allergen": "var(--pe-tag-allergen)",
          "tag-macro-bg": "var(--pe-tag-macro-bg)",
          "tag-macro": "var(--pe-tag-macro)",
          "tag-rank-bg": "var(--pe-tag-rank-bg)",
          "tag-rank": "var(--pe-tag-rank)",
          "tag-spice-bg": "var(--pe-tag-spice-bg)",
          "tag-spice": "var(--pe-tag-spice)",
          "badge-protein": "#e05050",
          "badge-vegetable": "#50b050",
          "badge-sauce": "#e08030",
          "badge-carb": "#d0c040",
        },
      },
      boxShadow: {
        "pe-card": "var(--pe-shadow-card)",
        "pe-lg": "var(--pe-shadow-lg)",
      },
    },
  },
  plugins: [],
};
export default config;
