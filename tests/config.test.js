import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { loadConfig, DEFAULT_CONFIG } from '../src/config.js';

describe('Config', () => {
    test('loadConfig should return DEFAULT_CONFIG when config file contains malformed JSON', (t) => {
        // Mock existsSync to simulate the config file existing
        t.mock.method(fs, 'existsSync', () => true);

        // Mock readFileSync to simulate reading invalid JSON
        t.mock.method(fs, 'readFileSync', () => '{ invalid json }');

        const config = loadConfig();

        // Should return the exact DEFAULT_CONFIG object
        assert.deepStrictEqual(config, DEFAULT_CONFIG, 'Should return DEFAULT_CONFIG when JSON parsing fails');
    });
});
