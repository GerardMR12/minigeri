/**
 * Base Agent class — all agents extend this.
 */
export class BaseAgent {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
    }

    /**
     * Send a message/prompt to the agent and get a response.
     * @param {string} message
     * @param {object} context - Additional context (conversation history, etc.)
     * @returns {Promise<string>} The agent's response
     */
    async send(message, context = {}) {
        throw new Error(`Agent "${this.name}" does not implement send()`);
    }

    /**
     * Start an interactive session with the agent.
     * @returns {Promise<void>}
     */
    async interactive() {
        throw new Error(`Agent "${this.name}" does not implement interactive()`);
    }

    /**
     * Check if the agent is available/installed.
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        return false;
    }
}
