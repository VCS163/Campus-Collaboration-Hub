import js from '@eslint/js';

export default [
  {
    ignores: ['coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        globalThis: 'readonly',
        localStorage: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Node: 'readonly',
        CustomEvent: 'readonly',
        FormData: 'readonly',
        TextEncoder: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-empty': 'off',
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none' }],
      'no-constant-binary-expression': 'error',
    },
  },
];
