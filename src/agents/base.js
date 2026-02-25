/**
 * Base Agent class — all agents extend this.
 *
 * Provides shared helper methods for tool-equipped agents:
 *   • buildSystemContext()  — loads instruction files from src/instructions/
 *   • logToolCall()         — pretty-prints tool invocations to stdout
 *   • clearHistory()        — clears conversation messages
 *   • getHistoryStats()     — returns turn/message counts
 */
import { loadAllInstructions } from '../utils/instructions.js';

export class BaseAgent {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;

        /**
         * Conversation history.
         * Format varies by provider but is always an array.
         */
        this.messages = [];
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

    // ── Shared helpers (used by tool-equipped agents) ────────────

    /**
     * Build a system message from instruction files in src/instructions/.
     * @returns {string|null} The system context string, or null if empty.
     */
    buildSystemContext() {
        return loadAllInstructions() || null;
    }

    /**
     * Log a tool call to stdout (when not in silent mode).
     * @param {string} toolName
     * @param {object} args
     */
    logToolCall(toolName, args) {
        let label;
        switch (toolName) {
            case 'list_files':
                label = '🗂️  Listing files...';
                break;
            case 'read_file':
                label = `📄 Reading ${args.path || 'file'}...`;
                break;
            case 'run_command':
                label = `⚙️  Running: ${args.command || 'command'}`;
                break;
            default:
                label = `🔧 ${toolName}...`;
                break;
        }
        process.stdout.write(`  ${label}\n`);
    }

    /**
     * Clear the conversation history.
     */
    clearHistory() {
        this.messages = [];
    }

    /**
     * Get conversation history stats.
     * @param {string} userRole - The role name for user messages (default: 'user')
     * @returns {{ turns: number, messages: number }}
     */
    getHistoryStats(userRole = 'user') {
        const userMessages = this.messages.filter((m) => m.role === userRole).length;
        return { turns: userMessages, messages: this.messages.length };
    }
}
