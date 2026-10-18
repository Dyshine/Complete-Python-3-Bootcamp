// Lints the game as the browser sees it: all src/game files joined into one scope (tools/lint.mjs writes that file).
import globals from 'globals';
export default [{
  files: ['.lint/game.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, THREE: 'readonly' } },
  rules: { 'no-undef': 'error', 'no-unused-vars': 'off', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error', 'no-redeclare': 'error', 'no-self-assign': 'error' },
}];
