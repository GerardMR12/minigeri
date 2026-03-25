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
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getAgent } from '../src/config.js';

describe('Config', () => {
    test('getAgent should throw an error for an unknown agent', () => {
        const unknownName = 'non-existent-agent-123';
        assert.throws(() => {
            getAgent(unknownName);
        }, (err) => {
            return err instanceof Error &&
                   err.message.includes(`Unknown agent: "${unknownName}"`) &&
                   err.message.includes('Available:');
        });
    });

    test('getAgent should return default agent if no name is provided', () => {
        const agent = getAgent();
        assert.ok(agent, 'Should return an agent');
        assert.ok(agent.name, 'Agent should have a name');
    });

    test('getAgent should return specific agent if valid name is provided', () => {
        const agentName = 'claude-api'; // Assuming 'claude-api' is in DEFAULT_CONFIG
        const agent = getAgent(agentName);
        assert.strictEqual(agent.name, agentName, 'Agent name should match the requested valid name');
    });
});
