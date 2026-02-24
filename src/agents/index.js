import { ClaudeCodeAgent } from './claude-code.js';
import { GeminiCliAgent } from './gemini-cli.js';

const AGENT_REGISTRY = {
    'claude-code': ClaudeCodeAgent,
    'gemini-cli': GeminiCliAgent,
};

/**
 * Create an agent instance by name.
 */
export function createAgent(name, config = {}) {
    const AgentClass = AGENT_REGISTRY[name];
    if (!AgentClass) {
        const available = Object.keys(AGENT_REGISTRY).join(', ');
        throw new Error(`Unknown agent: "${name}". Available agents: ${available}`);
    }
    return new AgentClass(config);
}

/**
 * List all registered agent names.
 */
export function listAgentNames() {
    return Object.keys(AGENT_REGISTRY);
}

export { AGENT_REGISTRY };
