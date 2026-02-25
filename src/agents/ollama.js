import http from 'http';
import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';

export class OllamaAgent extends BaseAgent {
    constructor(config = {}) {
        super('ollama', config);
        this.command = config.command || 'ollama';
        this.model = config.model || 'llama3';
        this.baseUrl = config.baseUrl || 'http://localhost:11434';

        // Conversation history: array of { role: 'user'|'assistant'|'system', content: string }
        this.messages = [];
    }

    /**
     * Send a message using the Ollama HTTP /api/chat endpoint.
     * Maintains conversation history for multi-turn context.
     * Streams the response token-by-token to stdout (unless silent).
     *
     * @param {string} message - The user's prompt
     * @param {object} [options] - Options
     * @param {boolean} [options.silent=false] - If true, suppress stdout streaming
     * @returns {Promise<string>} The full assistant response
     */
    async send(message, options = {}) {
        const silent = options.silent || false;
        // Add the user message to conversation history
        this.messages.push({ role: 'user', content: message });

        const body = JSON.stringify({
            model: this.model,
            messages: this.messages,
            stream: true,
        });

        return new Promise((resolve, reject) => {
            const url = new URL('/api/chat', this.baseUrl);

            const req = http.request(
                {
                    hostname: url.hostname,
                    port: url.port,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let fullResponse = '';
                    let buffer = '';

                    res.on('data', (chunk) => {
                        buffer += chunk.toString();

                        // Ollama streams newline-delimited JSON objects
                        const lines = buffer.split('\n');
                        // Keep the last (possibly incomplete) line in the buffer
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const json = JSON.parse(line);
                                if (json.message?.content) {
                                    const token = json.message.content;
                                    fullResponse += token;
                                    if (!silent) process.stdout.write(token);
                                }
                                if (json.error) {
                                    reject(new Error(json.error));
                                    return;
                                }
                            } catch {
                                // Skip malformed JSON lines
                            }
                        }
                    });

                    res.on('end', () => {
                        // Process any remaining buffer
                        if (buffer.trim()) {
                            try {
                                const json = JSON.parse(buffer);
                                if (json.message?.content) {
                                    const token = json.message.content;
                                    fullResponse += token;
                                    if (!silent) process.stdout.write(token);
                                }
                            } catch {
                                // Skip
                            }
                        }

                        // Add the assistant response to conversation history
                        if (fullResponse) {
                            this.messages.push({ role: 'assistant', content: fullResponse });
                        }
                        resolve(fullResponse);
                    });

                    res.on('error', reject);
                }
            );

            req.on('error', (err) => {
                // Remove the user message we just added since the request failed
                this.messages.pop();
                if (err.code === 'ECONNREFUSED') {
                    reject(new Error('Cannot connect to Ollama. Is the Ollama server running? (try: ollama serve)'));
                } else {
                    reject(err);
                }
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Clear the conversation history.
     */
    clearHistory() {
        this.messages = [];
    }

    /**
     * Get the current conversation history length.
     * @returns {{ turns: number, messages: number }}
     */
    getHistoryStats() {
        const userMessages = this.messages.filter(m => m.role === 'user').length;
        return { turns: userMessages, messages: this.messages.length };
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
