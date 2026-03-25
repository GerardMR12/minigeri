import { test, describe } from 'node:test';
import assert from 'node:assert';
import esmock from 'esmock';

describe('Config Loader', () => {
    test('ensureConfigDir should create directory if it does not exist', async () => {
        let mkdirCalled = false;

        const configModule = await esmock('../src/config.js', {
            'fs': {
                existsSync: () => false,
                mkdirSync: (path, options) => {
                    mkdirCalled = true;
                    assert.strictEqual(options.recursive, true);
                },
                readFileSync: () => { throw new Error('Not used'); },
                writeFileSync: () => { throw new Error('Not used'); }
            }
        });

        configModule.ensureConfigDir();
        assert.strictEqual(mkdirCalled, true, 'mkdirSync should have been called');
    });

    test('ensureConfigDir should not create directory if it already exists', async () => {
        let mkdirCalled = false;

        const configModule = await esmock('../src/config.js', {
            'fs': {
                existsSync: () => true,
                mkdirSync: () => {
                    mkdirCalled = true;
                },
                readFileSync: () => { throw new Error('Not used'); },
                writeFileSync: () => { throw new Error('Not used'); }
            }
        });

        configModule.ensureConfigDir();
        assert.strictEqual(mkdirCalled, false, 'mkdirSync should not have been called');
    });

    test('loadConfig should read JSON correctly and merge with defaults', async () => {
        const fakeConfig = {
            agents: {
                'claude-code': {
                    command: 'fake-claude'
                },
                'new-agent': {
                    type: 'cli',
                    command: 'my-agent'
                }
            },
            theme: 'dark'
        };

        const configModule = await esmock('../src/config.js', {
            'fs': {
                existsSync: () => true,
                mkdirSync: () => {},
                readFileSync: (path) => {
                    return JSON.stringify(fakeConfig);
                },
                writeFileSync: () => { throw new Error('Not used'); }
            }
        });

        const config = configModule.loadConfig();

        // Assertions for merged defaults
        assert.strictEqual(config.theme, 'dark');

        // Assertions for merged agents
        assert.strictEqual(config.agents['claude-code'].command, 'fake-claude');
        // Check that defaults for claude-code type were preserved
        assert.strictEqual(config.agents['claude-code'].type, 'cli');

        // Check that new agent was added
        assert.strictEqual(config.agents['new-agent'].command, 'my-agent');

        // Check that untouched agents retain defaults
        assert.strictEqual(config.agents['gemini-api'].type, 'api');
    });

    test('loadConfig should gracefully handle invalid JSON and return defaults', async () => {
        const configModule = await esmock('../src/config.js', {
            'fs': {
                existsSync: () => true,
                mkdirSync: () => {},
                readFileSync: () => {
                    return '{ invalid json }';
                },
                writeFileSync: () => { throw new Error('Not used'); }
            }
        });

        const config = configModule.loadConfig();

        assert.strictEqual(config.theme, 'default');
        assert.strictEqual(config.agents['claude-code'].type, 'cli');
        assert.strictEqual(config.agents['claude-api'].type, 'api');
    });

    test('loadConfig should return defaults when file does not exist', async () => {
        const configModule = await esmock('../src/config.js', {
            'fs': {
                existsSync: (path) => {
                    // pretend config dir exists, but config file does not
                    if (path.includes('config.json')) return false;
                    return true;
                },
                mkdirSync: () => {},
                readFileSync: () => {
                    throw new Error('Should not be called');
                },
                writeFileSync: () => { throw new Error('Not used'); }
            }
        });

        const config = configModule.loadConfig();

        assert.strictEqual(config.theme, 'default');
        assert.strictEqual(config.agents['claude-code'].type, 'cli');
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
