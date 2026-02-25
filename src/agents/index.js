import { ClaudeCodeAgent } from './claude-code.js';
import { GeminiCliAgent } from './gemini-cli.js';
import { OllamaAgent } from './ollama.js';
import { GroqAgent } from './groq.js';
import { ClaudeApiAgent } from './claude-api.js';
import { GeminiApiAgent } from './gemini-api.js';

const AGENT_REGISTRY = {
    'claude-code': ClaudeCodeAgent,
    'gemini-cli': GeminiCliAgent,
    'ollama': OllamaAgent,
    'groq': GroqAgent,
    'claude-api': ClaudeApiAgent,
    'gemini-api': GeminiApiAgent,
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
