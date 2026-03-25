import test from 'node:test';
import assert from 'node:assert';
import { statSync, existsSync, unlinkSync } from 'fs';
import { saveConfig, CONFIG_FILE, DEFAULT_CONFIG } from '../src/config.js';

test('Config file permissions are secure', () => {
    // Save default config
    saveConfig(DEFAULT_CONFIG);

    // Check file exists
    assert.ok(existsSync(CONFIG_FILE));

    // Check file permissions
    const stats = statSync(CONFIG_FILE);
    // Masking with 0o777 to only get the read/write/execute permission bits
    const permissions = stats.mode & 0o777;

    assert.strictEqual(permissions, 0o600, `Expected permissions 0o600, got 0o${permissions.toString(8)}`);
});