import http from 'http';
import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { toOpenAITools, executeTool } from '../tools/index.js';

/**
 * Ollama Agent — local LLM inference with tool calling.
 *
 * Uses the Ollama HTTP API (/api/chat) which supports
 * OpenAI-compatible function calling for capable models.
 */
export class OllamaAgent extends BaseAgent {
    constructor(config = {}) {
        super('ollama', config);
        this.command = config.command || 'ollama';
        this.model = config.model || 'llama3';
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
    }

    /**
     * Send a message using the Ollama HTTP /api/chat endpoint.
     * Supports tool calling — the model can request files as needed.
     * Streams the final response token-by-token to stdout (unless silent).
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

        // Build file-tree system context
        const systemContext = this.buildSystemContext();
        if (
            systemContext &&
            !this.messages.some((m) => m.role === 'system')
        ) {
            // Prepend system message only once
            this.messages.unshift({ role: 'system', content: systemContext });
        }

        // Shared tools in OpenAI format (Ollama uses the same schema)
        const tools = toOpenAITools();

        // Tool-calling loop
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const result = await this._callApi(this.messages, {
                stream: false, // Non-streaming for tool-call detection
                tools,
                silent,
            });

            // If the model returned tool calls, execute them and loop
            if (result.toolCalls && result.toolCalls.length > 0) {
                this.messages.push({
                    role: 'assistant',
                    content: '',
                    tool_calls: result.toolCalls,
                });

                for (const tc of result.toolCalls) {
                    const args = tc.function?.arguments || {};

                    if (!silent) this.logToolCall(tc.function?.name, args);

                    const toolResult = await executeTool(tc.function.name, args);
                    this.messages.push({
                        role: 'tool',
                        content: toolResult,
                    });
                }

                continue;
            }

            // No tool calls — final text response
            if (result.content) {
                if (!silent) process.stdout.write(result.content);
                this.messages.push({ role: 'assistant', content: result.content });
            }
            return result.content;
        }

        return '';
    }

    /**
     * Call the Ollama /api/chat endpoint.
     * @private
     */
    _callApi(messages, { stream = false, tools, silent = false }) {
        return new Promise((resolve, reject) => {
            const bodyObj = {
                model: this.model,
                messages,
                stream,
            };

            // Only include tools if the array is non-empty
            if (tools && tools.length > 0) {
                bodyObj.tools = tools;
            }

            const body = JSON.stringify(bodyObj);
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
                    if (stream) {
                        // Streaming mode — token by token
                        let fullResponse = '';
                        let buffer = '';

                        res.on('data', (chunk) => {
                            buffer += chunk.toString();
                            const lines = buffer.split('\n');
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
                                } catch { }
                            }
                        });

                        res.on('end', () => {
                            if (buffer.trim()) {
                                try {
                                    const json = JSON.parse(buffer);
                                    if (json.message?.content) {
                                        const token = json.message.content;
                                        fullResponse += token;
                                        if (!silent) process.stdout.write(token);
                                    }
                                } catch { }
                            }
                            resolve({ content: fullResponse, toolCalls: null });
                        });
                        res.on('error', reject);
                    } else {
                        // Non-streaming mode — parse JSON response
                        let responseBody = '';
                        res.on('data', (c) => {
                            responseBody += c.toString();
                        });
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(responseBody);

                                if (json.error) {
                                    reject(new Error(json.error));
                                    return;
                                }

                                const message = json.message || {};
                                const toolCalls = message.tool_calls;
                                const content = message.content || '';

                                if (toolCalls && toolCalls.length > 0) {
                                    resolve({ content: '', toolCalls });
                                } else {
                                    resolve({ content, toolCalls: null });
                                }
                            } catch (err) {
                                reject(new Error('Failed to parse Ollama API response'));
                            }
                        });
                        res.on('error', reject);
                    }
                }
            );

            req.on('error', (err) => {
                this.messages.pop();
                if (err.code === 'ECONNREFUSED') {
                    reject(
                        new Error(
                            'Cannot connect to Ollama. Is the Ollama server running? (try: ollama serve)'
                        )
                    );
                } else {
                    reject(err);
                }
            });

            req.write(body);
            req.end();
        });
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
        const result = await execAgent(this.command, ['list'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        if (result.code !== 0) {
            throw new Error(`Failed to list models: ${result.stderr}`);
        }

        const raw = result.stdout.trim();
        const lines = raw.split('\n');

        const models = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
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
     * @param {string} modelName
     * @returns {Promise<string>}
     */
    async showModel(modelName) {
        const name = modelName || this.model;
        const result = await execAgent(this.command, ['show', name], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (result.code !== 0) {
            throw new Error(`Failed to show model "${name}": ${result.stderr}`);
        }
        return result.stdout.trim();
    }

    /**
     * Pull (download) a model from the Ollama registry.
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
        const result = await execAgent(this.command, ['rm', modelName], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
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
        const result = await execAgent(this.command, ['ps'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (result.code !== 0) {
            throw new Error(`Failed to list running models: ${result.stderr}`);
        }
        return result.stdout.trim();
    }
}
