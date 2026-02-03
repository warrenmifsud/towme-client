import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noHardcodedColors from './eslint-plugin-no-hardcoded-colors.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'no-hardcoded-colors': noHardcodedColors,
    },
    rules: {
      // Custom rule to ban hardcoded color utilities
      'no-hardcoded-colors/no-hardcoded-colors': 'error',

      // Disable unused vars warning for React imports (React 19)
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^React$',
        argsIgnorePattern: '^_',
      }],
    },
  },
])
