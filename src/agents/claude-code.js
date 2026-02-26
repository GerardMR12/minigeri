import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';

export class ClaudeCodeAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-code', config);
        this.command = config.command || 'claude';
    }

    _getCleanEnv() {
        const env = { ...process.env };
        // Unconditionally remove the API key so Claude Code uses its own auth
        delete env.ANTHROPIC_API_KEY;
        return env;
    }

    async send(message, context = {}) {
        const args = ['-p', message, '--dangerously-skip-permissions'];

        // Add conversation continuation if available
        if (context.conversationId) {
            args.push('--conversation', context.conversationId);
        }

        const result = await execAgent(this.command, args, { env: this._getCleanEnv() });

        if (result.code !== 0) {
            throw new Error(`Claude Code exited with code ${result.code}: ${result.stderr || result.stdout}`);
        }

        return result.stdout.trim();
    }

    async interactive() {
        return execInteractive(this.command, [], { env: this._getCleanEnv() });
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version'], { env: this._getCleanEnv() });
            return result.code === 0;
        } catch {
            return false;
        }
    }
}
