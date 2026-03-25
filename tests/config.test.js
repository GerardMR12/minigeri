import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { saveConfig, CONFIG_FILE } from '../src/config.js';

describe('config', () => {
    test('saveConfig writes JSON to CONFIG_FILE with correct mode', (t) => {
        let writtenPath, writtenData, writtenOptions;

        t.mock.method(fs, 'writeFileSync', (path, data, options) => {
            writtenPath = path;
            writtenData = data;
            writtenOptions = options;
        });

        t.mock.method(fs, 'existsSync', () => true);

        const testConfig = { theme: 'dark', agents: {} };
        saveConfig(testConfig);

        assert.strictEqual(writtenPath, CONFIG_FILE);
        assert.strictEqual(writtenData, JSON.stringify(testConfig, null, 2));
        assert.deepStrictEqual(writtenOptions, { mode: 0o600 });
    });

    test('saveConfig calls ensureConfigDir which creates dir if not exists', (t) => {
        let createdDir, createOptions;

        t.mock.method(fs, 'writeFileSync', () => {});
        t.mock.method(fs, 'existsSync', () => false); // force dir creation
        t.mock.method(fs, 'mkdirSync', (dir, options) => {
            createdDir = dir;
            createOptions = options;
        });

        saveConfig({});

        assert.ok(createdDir);
        assert.deepStrictEqual(createOptions, { recursive: true, mode: 0o700 });
    });
});
