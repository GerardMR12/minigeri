import { test, describe } from 'node:test';
import assert from 'node:assert';
import { setTheme, colors, palettes } from '../src/ui/theme.js';

describe('Theme Management', () => {
    test('setTheme should fallback to default palette for invalid themeId', () => {
        // Clear out the colors object to ensure we are testing the assignment
        for (const key of Object.keys(colors)) {
            delete colors[key];
        }

        const invalidThemeId = 'non-existent-theme-xyz';

        // Call setTheme with the invalid theme ID
        setTheme(invalidThemeId);

        const defaultPalette = palettes.default;

        // Verify that colors object has all the keys from the default palette
        for (const key of Object.keys(defaultPalette)) {
            assert.ok(key in colors, `colors object should have key "${key}"`);
            assert.strictEqual(typeof colors[key], 'function', `colors.${key} should be a chalk function`);
        }
    });

    test('setTheme should apply valid theme palette', () => {
        // Clear out the colors object
        for (const key of Object.keys(colors)) {
            delete colors[key];
        }

        const validThemeId = 'cyberpunk';

        // Call setTheme with a valid theme ID
        setTheme(validThemeId);

        const targetPalette = palettes[validThemeId];

        // Verify that colors object has all the keys from the target palette
        for (const key of Object.keys(targetPalette)) {
            assert.ok(key in colors, `colors object should have key "${key}"`);
            assert.strictEqual(typeof colors[key], 'function', `colors.${key} should be a chalk function`);
        }
    });
});
