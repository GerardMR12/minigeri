import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { spawn } from 'child_process';

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

        const result = await execAgent(this.command, args);

        if (result.code !== 0) {
            throw new Error(`Claude Code exited with code ${result.code}: ${result.stderr}`);
        }

        return result.stdout.trim();
    }

    async interactive() {
        return execInteractive(this.command);
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version']);
            return result.code === 0;
        } catch {
            return false;
        }
    }
}
