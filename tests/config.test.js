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
