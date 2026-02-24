import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';

export class GeminiCliAgent extends BaseAgent {
    constructor(config = {}) {
        super('gemini-cli', config);
        this.command = config.command || 'gemini';
    }

    async send(message, context = {}) {
        // Add -y (YOLO mode) so it can execute tools gracefully without confirmation
        const args = ['-p', message, '-y'];

        const result = await execAgent(this.command, args);

        if (result.code !== 0) {
            throw new Error(`Gemini CLI exited with code ${result.code}: ${result.stderr}`);
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
