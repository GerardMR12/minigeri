import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';

export class OllamaAgent extends BaseAgent {
    constructor(config = {}) {
        super('ollama', config);
        this.command = config.command || 'ollama';
        this.model = config.model || 'llama3';
    }

    async send(message, context = {}) {
        const args = ['run', this.model, message];

        const result = await execAgent(this.command, args);

        if (result.code !== 0) {
            throw new Error(`Ollama exited with code ${result.code}: ${result.stderr}`);
        }

        return result.stdout.trim();
    }

    async interactive() {
        return execInteractive(this.command, ['run', this.model]);
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version']);
            return result.code === 0;
        } catch {
            return false;
        }
    }

    /**
     * List all locally available models.
     * @returns {Promise<{ models: Array<{ name: string, size: string, modified: string }>, raw: string }>}
     */
    async listModels() {
        const result = await execAgent(this.command, ['list'], { stdio: ['pipe', 'pipe', 'pipe'] });

        if (result.code !== 0) {
            throw new Error(`Failed to list models: ${result.stderr}`);
        }

        const raw = result.stdout.trim();
        const lines = raw.split('\n');

        // First line is the header, parse the rest
        const models = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Ollama list output columns: NAME, ID, SIZE, MODIFIED
            const parts = line.split(/\s{2,}/);
            models.push({
                name: parts[0] || '',
                id: parts[1] || '',
                size: parts[2] || '',
                modified: parts[3] || '',
            });
        }

        return { models, raw };
    }

    /**
     * Show detailed info about a specific model.
     * @param {string} modelName - Model name to inspect
     * @returns {Promise<string>}
     */
    async showModel(modelName) {
        const name = modelName || this.model;
        const result = await execAgent(this.command, ['show', name], { stdio: ['pipe', 'pipe', 'pipe'] });

        if (result.code !== 0) {
            throw new Error(`Failed to show model "${name}": ${result.stderr}`);
        }

        return result.stdout.trim();
    }

    /**
     * Pull (download) a model from the Ollama registry.
     * Runs interactively so the user can see progress.
     * @param {string} modelName
     */
    async pullModel(modelName) {
        return execInteractive(this.command, ['pull', modelName]);
    }

    /**
     * Remove a locally installed model.
     * @param {string} modelName
     * @returns {Promise<string>}
     */
    async removeModel(modelName) {
        const result = await execAgent(this.command, ['rm', modelName], { stdio: ['pipe', 'pipe', 'pipe'] });

        if (result.code !== 0) {
            throw new Error(`Failed to remove model "${modelName}": ${result.stderr}`);
        }

        return result.stdout.trim();
    }

    /**
     * List running models.
     * @returns {Promise<string>}
     */
    async listRunning() {
        const result = await execAgent(this.command, ['ps'], { stdio: ['pipe', 'pipe', 'pipe'] });

        if (result.code !== 0) {
            throw new Error(`Failed to list running models: ${result.stderr}`);
        }

        return result.stdout.trim();
    }
}
