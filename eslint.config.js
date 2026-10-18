// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*'],
  },
  {
    // Game logic must stay pure TypeScript: no React, React Native, Expo or shared UI imports.
    files: ['src/games/*/logic/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-native*',
            'expo*',
            '@expo/*',
            '@/components/*',
            '@/hooks/*',
          ],
        },
      ],
    },
  },
]);
