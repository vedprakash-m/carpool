module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Relaxed rules for initial cleanup
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Disabled for migration
    '@typescript-eslint/no-unsafe-assignment': 'off', // Disabled for migration
    '@typescript-eslint/no-unsafe-member-access': 'off', // Disabled for migration
    '@typescript-eslint/no-unsafe-call': 'off', // Disabled for migration
    '@typescript-eslint/no-unsafe-return': 'off', // Disabled for migration
    '@typescript-eslint/no-unsafe-argument': 'off', // Disabled for migration
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'off', // Disabled for migration
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/no-floating-promises': 'off', // Disabled for migration
    '@typescript-eslint/no-redundant-type-constituents': 'warn',
    'no-console': 'off', // Disabled for debugging during migration
    'no-useless-escape': 'warn',
    // Disable security rules temporarily to focus on TypeScript issues
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
    'security/detect-unsafe-regex': 'off',
    'security/detect-non-literal-regexp': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    'auth-*/',
    'trips-*/',
    'users-*/',
    'core/',
    'coverage/',
    '__tests__/',
    'tests/',
  ],
};
