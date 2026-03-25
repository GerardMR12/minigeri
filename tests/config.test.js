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
    });
});
