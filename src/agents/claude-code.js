import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { spawn } from 'child_process';

/**
 * Build a clean env for Claude Code CLI.
 * If ANTHROPIC_API_KEY is empty or a placeholder, remove it so Claude Code
 * falls back to its own built-in auth instead of erroring with "Invalid API key".
 */
function getCleanEnv() {
    const env = { ...process.env };
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.trim() === '') {
        delete env.ANTHROPIC_API_KEY;
    }
    return env;
}

export class ClaudeCodeAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-code', config);
        this.command = config.command || 'claude';
    }

    async send(message, context = {}) {
        const args = ['-p', message, '--dangerously-skip-permissions'];

        // Add conversation continuation if available
        if (context.conversationId) {
            args.push('--conversation', context.conversationId);
        }

        const result = await execAgent(this.command, args, { env: getCleanEnv() });

        if (result.code !== 0) {
            throw new Error(`Claude Code exited with code ${result.code}: ${result.stderr}`);
        }

        return result.stdout.trim();
    }

    async interactive() {
        return execInteractive(this.command, [], { env: getCleanEnv() });
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version'], { env: getCleanEnv() });
            return result.code === 0;
        } catch {
            return false;
        }
    }
}
