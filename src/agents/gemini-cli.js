import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';

export class GeminiCliAgent extends BaseAgent {
    constructor(config = {}) {
        super('gemini-cli', config);
        this.command = config.command || 'gemini';
        this.sessionId = null;
    }

    async send(message, options = {}) {
        const silent = options.silent || false;
        // Add -y (YOLO mode) and JSON output to capture session IDs
        const args = ['-p', message, '-y', '--output-format', 'json'];

        if (this.sessionId) {
            args.push('--resume', this.sessionId);
        }

        const result = await execAgent(this.command, args, { silent: true });

        if (result.code !== 0) {
            throw new Error(`Gemini CLI exited with code ${result.code}: ${result.stderr || result.stdout}`);
        }

        try {
            // Find the JSON block in stdout (it might have preamble logs like YOLO mode enabled)
            const stdout = result.stdout;
            const jsonStart = stdout.indexOf('{');
            if (jsonStart === -1) throw new Error('No JSON found in output');
            
            const data = JSON.parse(stdout.substring(jsonStart));
            
            // Save session ID for next turn
            if (data.session_id) {
                this.sessionId = data.session_id;
            }

            const text = data.response || '';
            
            // If not silent, print the response manually since we suppressed it in execAgent
            if (!silent && text) {
                process.stdout.write(text + '\n');
            }

            return text.trim();
        } catch (err) {
            // Fallback: if JSON fails, return raw stdout but it might be messy
            if (!silent) process.stdout.write(result.stdout);
            return result.stdout.trim();
        }
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
