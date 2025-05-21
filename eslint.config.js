import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        node: true,
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Make sure Prettier config comes last to override other formatting rules
  prettier,
];
