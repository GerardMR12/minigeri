import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createAgent, listAgentNames } from '../src/agents/index.js';
import { BaseAgent } from '../src/agents/base.js';
import { ClaudeCodeAgent } from '../src/agents/claude-code.js';

describe('Agent Factory', () => {
    test('createAgent should throw an error for an unknown agent', () => {
        const unknownName = 'non-existent-agent';
        assert.throws(() => {
            createAgent(unknownName);
        }, (err) => {
            return err instanceof Error &&
                   err.message.includes(`Unknown agent: "${unknownName}"`) &&
                   err.message.includes('Available agents:');
        });
    });

    test('createAgent should return a valid agent instance for a registered name', () => {
        const agentNames = listAgentNames();
        if (agentNames.length > 0) {
            const name = agentNames[0];
            const agent = createAgent(name);
            assert.ok(agent instanceof BaseAgent, `Agent ${name} should be an instance of BaseAgent`);
            assert.strictEqual(agent.name, name);
        }
    });

    test('createAgent should return an instance of ClaudeCodeAgent for "claude-code"', () => {
        const agent = createAgent('claude-code');
        assert.ok(agent instanceof ClaudeCodeAgent, 'Agent should be an instance of ClaudeCodeAgent');
        assert.strictEqual(agent.name, 'claude-code');
    });

    test('listAgentNames should return a non-empty array of agent names', () => {
        const names = listAgentNames();
        assert.ok(Array.isArray(names), 'listAgentNames should return an array');
        assert.ok(names.length > 0, 'listAgentNames should return at least one agent');
        assert.ok(names.includes('claude-api'), 'listAgentNames should include "claude-api"');
    });
});
