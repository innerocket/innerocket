import js from '@eslint/js'
import globals from 'globals'
import solid from 'eslint-plugin-solid'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import oxlint from 'eslint-plugin-oxlint'
import storybook from 'eslint-plugin-storybook'

export default [
  {
    ignores: ['dist'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },
    },
    plugins: {
      solid: solid,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      // SolidJS specific rules (basic ones only)
      'solid/no-destructure': 'warn',
      'solid/prefer-for': 'warn',
    },
  },
  prettier, // Oxlint configuration to disable conflicting rules
  {
    plugins: {
      oxlint: oxlint,
    },
    rules: {
      ...oxlint.configs['flat/recommended'].rules,
    },
  },
  ...storybook.configs['flat/recommended'],
]
