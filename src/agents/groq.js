import https from 'https';
import { BaseAgent } from './base.js';

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

        // Conversation history: array of { role: 'user'|'assistant'|'system', content: string }
        this.messages = [];
    }

    /**
     * Send a message using the Groq /openai/v1/chat/completions endpoint.
     * Maintains conversation history for multi-turn context.
     * Streams the response token-by-token to stdout (unless silent).
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

        const body = JSON.stringify({
            model: this.model,
            messages: this.messages,
            stream: true,
        });

        return new Promise((resolve, reject) => {
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
                        this.messages.pop();
                        reject(new Error('Invalid GROQ_API_KEY. Check your key at https://console.groq.com/keys'));
                        return;
                    }
                    if (res.statusCode === 429) {
                        this.messages.pop();
                        reject(new Error('Groq rate limit exceeded. The free tier has request limits — wait a moment and try again.'));
                        return;
                    }
                    if (res.statusCode !== 200) {
                        let errorBody = '';
                        res.on('data', (chunk) => { errorBody += chunk.toString(); });
                        res.on('end', () => {
                            this.messages.pop();
                            try {
                                const parsed = JSON.parse(errorBody);
                                reject(new Error(`Groq API error (${res.statusCode}): ${parsed.error?.message || errorBody}`));
                            } catch {
                                reject(new Error(`Groq API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

                    let fullResponse = '';
                    let buffer = '';

                    res.on('data', (chunk) => {
                        buffer += chunk.toString();

                        // SSE format: lines starting with "data: "
                        const lines = buffer.split('\n');
                        // Keep the last (possibly incomplete) line in the buffer
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || !trimmed.startsWith('data: ')) continue;

                            const data = trimmed.slice(6); // Remove "data: " prefix
                            if (data === '[DONE]') continue;

                            try {
                                const json = JSON.parse(data);
                                const token = json.choices?.[0]?.delta?.content;
                                if (token) {
                                    fullResponse += token;
                                    if (!silent) process.stdout.write(token);
                                }
                            } catch {
                                // Skip malformed JSON
                            }
                        }
                    });

                    res.on('end', () => {
                        // Process any remaining buffer
                        if (buffer.trim()) {
                            const lines = buffer.split('\n');
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
                                } catch {
                                    // Skip
                                }
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
