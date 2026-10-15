// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // ponytail: template hook (web hydration flag) trips react-hooks/set-state-in-effect; rule is
    // off for this one file because src/hooks/ was out of M1's scope. Ceiling: rewrite the hook, then delete this block.
    files: ['src/hooks/use-color-scheme.web.ts'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
]);
