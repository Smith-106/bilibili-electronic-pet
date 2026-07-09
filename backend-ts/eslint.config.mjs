import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', 'package-lock.json', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // L9 legal red-line code-layer enforce (TASK-006): captcha/slider/bypass code MUST NEVER
      // be added. The bot does not implement打码平台 (captcha-solving platforms), 绕滑块
      // (slider bypass), or any anti-antirisk evasion. This rule fails the build on any
      // identifier matching captcha|slider|bypass, preventing accidental introduction.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Identifier[name=/^(captcha|slider|bypass)$/i]",
          message:
            'Legal red-line (L9): captcha/slider/bypass identifiers are forbidden — the bot must not implement captcha-solving, slider-bypass, or any anti-antirisk evasion. See TASK-006.',
        },
      ],
    },
  },
  {
    files: ['test/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
);
