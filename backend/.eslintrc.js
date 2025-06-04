module.exports = {
  env: {
    node: true,
    es2020: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    // Basic rules that work without TypeScript parser
    "no-unused-vars": ["warn"],
    "no-console": ["warn"],
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "*.js",
    "auth-*/",
    "trips-*/",
    "users-*/",
  ],
};
