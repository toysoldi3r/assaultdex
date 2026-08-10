import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        raise: "var(--raise)",
        line: "var(--line)",
        soft: "var(--soft)",
        t1: "var(--t1)",
        t2: "var(--t2)",
        t3: "var(--t3)",
        acc: "var(--acc)",
        accs: "var(--accs)",
        accbg: "var(--accbg)",
        accln: "var(--accln)",
        pos: "var(--pos)",
        neg: "var(--neg)",
      },
    },
  },
  plugins: [],
};

export default config;
