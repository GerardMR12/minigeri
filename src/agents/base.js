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
import { colors } from '../ui/theme.js';
import { loadConfig } from '../config.js';

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
        let context = loadAllInstructions() || '';
        const config = loadConfig();

        if (config.activeWorkspace && config.workspaces?.[config.activeWorkspace]) {
            const name = config.activeWorkspace;
            const roots = config.workspaces[name];
            let workspaceInfo = `\n\n# ACTIVE VIRTUAL WORKSPACE: ${name}\n`;
            workspaceInfo += `You are working across multiple project directories simultaneously:\n`;
            for (const [alias, path] of Object.entries(roots)) {
                workspaceInfo += `- ${alias}: ${path}\n`;
            }
            workspaceInfo += `\nFiles listed via list_files will be prefixed with their folder name (e.g., "frontend/src/App.js").\n`;
            workspaceInfo += `Use these prefixes when calling read_file.\n`;
            context += workspaceInfo;
        }

        return context || null;
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
        process.stdout.write(`  ${colors.muted(label)}\n`);
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
