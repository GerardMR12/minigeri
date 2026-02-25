import https from 'https';
import { BaseAgent } from './base.js';
import { toOpenAITools, executeTool } from '../tools/index.js';

/**
 * Groq Cloud Agent — blazing-fast inference for open-source models.
 *
 * Uses the free Groq API (https://console.groq.com).
 * API key required: set GROQ_API_KEY in your .env file.
 * Get a free key at: https://console.groq.com/keys
 */
export class GroqAgent extends BaseAgent {
    constructor(config = {}) {
        super('groq', config);
        this.apiKey = config.apiKey || process.env.GROQ_API_KEY || '';
        this.model = config.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.baseUrl = config.baseUrl || 'https://api.groq.com';
    }

    /**
     * Send a message using the Groq /openai/v1/chat/completions endpoint.
     * Supports tool calling — the model can request files as needed.
     * Streams the final response token-by-token to stdout (unless silent).
     *
     * @param {string} message - The user's prompt
     * @param {object} [options] - Options
     * @param {boolean} [options.silent=false] - If true, suppress stdout streaming
     * @returns {Promise<string>} The full assistant response
     */
    async send(message, options = {}) {
        if (!this.apiKey) {
            throw new Error(
                'GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys and add it to your .env file.'
            );
        }

        const silent = options.silent || false;

        // Add the user message to conversation history
        this.messages.push({ role: 'user', content: message });

        // Build file-tree system context
        const systemContext = this.buildSystemContext();
        const systemMessage = systemContext ? { role: 'system', content: systemContext } : null;

        // Shared tools in OpenAI format
        const tools = toOpenAITools();

        // Tool-calling loop: keep calling until the model gives a final text response
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const apiMessages = [];
            if (systemMessage) apiMessages.push(systemMessage);
            apiMessages.push(...this.messages);

            const result = await this._callApi(apiMessages, {
                stream: false,
                tools,
                silent,
            });

            // If the model returned tool calls, execute them and loop
            if (result.toolCalls && result.toolCalls.length > 0) {
                this.messages.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: result.toolCalls,
                });

                for (const tc of result.toolCalls) {
                    let args = {};
                    try {
                        const parsed = JSON.parse(tc.function?.arguments || '{}');
                        if (parsed && typeof parsed === 'object') args = parsed;
                    } catch { }

                    if (!silent) this.logToolCall(tc.function?.name, args);

                    const toolResult = await executeTool(tc.function.name, args);
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: toolResult,
                    });
                }

                continue;
            }

            // No tool calls — this is the final text response
            if (result.content) {
                this.messages.push({ role: 'assistant', content: result.content });
            }
            return result.content;
        }

        return '';
    }

    /**
     * Call the Groq API once.
     * @private
     */
    _callApi(messages, { stream = false, tools, silent = false }) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: this.model,
                messages,
                stream,
                ...(tools ? { tools, tool_choice: 'auto' } : {}),
            });

            const url = new URL('/openai/v1/chat/completions', this.baseUrl);

            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                },
                (res) => {
                    if (res.statusCode === 401) {
                        reject(new Error('Invalid GROQ_API_KEY. Check your key at https://console.groq.com/keys'));
                        return;
                    }
                    if (res.statusCode === 429) {
                        reject(new Error('Groq rate limit exceeded. The free tier has request limits — wait a moment and try again.'));
                        return;
                    }
                    if (res.statusCode !== 200) {
                        let errorBody = '';
                        res.on('data', (c) => { errorBody += c.toString(); });
                        res.on('end', () => {
                            try {
                                const parsed = JSON.parse(errorBody);
                                reject(new Error(`Groq API error (${res.statusCode}): ${parsed.error?.message || errorBody}`));
                            } catch {
                                reject(new Error(`Groq API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

                    if (stream) {
                        let fullResponse = '';
                        let buffer = '';

                        res.on('data', (chunk) => {
                            buffer += chunk.toString();
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                                const data = trimmed.slice(6);
                                if (data === '[DONE]') continue;
                                try {
                                    const json = JSON.parse(data);
                                    const token = json.choices?.[0]?.delta?.content;
                                    if (token) {
                                        fullResponse += token;
                                        if (!silent) process.stdout.write(token);
                                    }
                                } catch { }
                            }
                        });

                        res.on('end', () => {
                            if (buffer.trim()) {
                                for (const line of buffer.split('\n')) {
                                    const trimmed = line.trim();
                                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                                    const data = trimmed.slice(6);
                                    if (data === '[DONE]') continue;
                                    try {
                                        const json = JSON.parse(data);
                                        const token = json.choices?.[0]?.delta?.content;
                                        if (token) {
                                            fullResponse += token;
                                            if (!silent) process.stdout.write(token);
                                        }
                                    } catch { }
                                }
                            }
                            resolve({ content: fullResponse, toolCalls: null });
                        });
                        res.on('error', reject);
                    } else {
                        let body = '';
                        res.on('data', (c) => { body += c.toString(); });
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(body);
                                const choice = json.choices?.[0];
                                const toolCalls = choice?.message?.tool_calls;
                                const content = choice?.message?.content || '';

                                if (toolCalls && toolCalls.length > 0) {
                                    resolve({ content: '', toolCalls });
                                } else {
                                    if (content && !silent) process.stdout.write(content);
                                    resolve({ content, toolCalls: null });
                                }
                            } catch (err) {
                                reject(new Error('Failed to parse Groq API response'));
                            }
                        });
                        res.on('error', reject);
                    }
                }
            );

            req.on('error', (err) => {
                if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
                    reject(new Error('Cannot reach Groq API. Check your internet connection.'));
                } else {
                    reject(err);
                }
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * List available Groq models via the API.
     * @returns {Promise<{ models: Array<{ id: string, owned_by: string }>, raw: string }>}
     */
    async listModels() {
        if (!this.apiKey) {
            throw new Error('GROQ_API_KEY is not set.');
        }

        return new Promise((resolve, reject) => {
            const url = new URL('/openai/v1/models', this.baseUrl);

            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                },
                (res) => {
                    let body = '';
                    res.on('data', (chunk) => { body += chunk.toString(); });
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.error) {
                                reject(new Error(`Groq API error: ${parsed.error.message}`));
                                return;
                            }
                            const models = (parsed.data || [])
                                .filter(m => m.active !== false)
                                .map(m => ({
                                    id: m.id,
                                    owned_by: m.owned_by || '',
                                }))
                                .sort((a, b) => a.id.localeCompare(b.id));
                            resolve({ models, raw: body });
                        } catch {
                            reject(new Error('Failed to parse Groq models response'));
                        }
                    });
                    res.on('error', reject);
                }
            );

            req.on('error', (err) => {
                if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
                    reject(new Error('Cannot reach Groq API. Check your internet connection.'));
                } else {
                    reject(err);
                }
            });

            req.end();
        });
    }

    async isAvailable() {
        return !!this.apiKey;
    }
}
