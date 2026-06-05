import nextVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  ...nextVitals,
  {
    rules: {
      // Disabled: this rule flags legitimate async data-fetching patterns
      // where async functions called inside useEffect internally call setState.
      // This is a well-established pattern in Next.js / React applications.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default config;
