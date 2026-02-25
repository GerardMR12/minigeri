import https from 'https';
import { BaseAgent } from './base.js';

/**
 * Claude API Agent
 * Uses the Anthropic Messages API.
 */
export class ClaudeApiAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-api', config);
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.model = config.model || 'claude-3-7-sonnet-20250219';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com';

        // Conversation history: array of { role: 'user'|'assistant', content: string }
        this.messages = [];
    }

    async send(message, options = {}) {
        if (!this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
        }

        const silent = options.silent || false;
        this.messages.push({ role: 'user', content: message });

        const body = JSON.stringify({
            model: this.model,
            max_tokens: 4096,
            messages: this.messages,
            stream: true,
        });

        return new Promise((resolve, reject) => {
            const url = new URL('/v1/messages', this.baseUrl);
            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let errorBody = '';
                        res.on('data', (c) => errorBody += c);
                        res.on('end', () => {
                            this.messages.pop();
                            try {
                                const parsed = JSON.parse(errorBody);
                                reject(new Error(`Anthropic API error (${res.statusCode}): ${parsed.error?.message || errorBody}`));
                            } catch {
                                reject(new Error(`Anthropic API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

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
                            try {
                                const json = JSON.parse(data);
                                if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                                    const token = json.delta.text;
                                    fullResponse += token;
                                    if (!silent) process.stdout.write(token);
                                }
                            } catch { }
                        }
                    });

                    res.on('end', () => {
                        if (fullResponse) {
                            this.messages.push({ role: 'assistant', content: fullResponse });
                        }
                        resolve(fullResponse);
                    });
                    res.on('error', reject);
                }
            );

            req.on('error', (err) => {
                this.messages.pop();
                reject(err);
            });
            req.write(body);
            req.end();
        });
    }

    clearHistory() {
        this.messages = [];
    }
    getHistoryStats() {
        const userMessages = this.messages.filter(m => m.role === 'user').length;
        return { turns: userMessages, messages: this.messages.length };
    }
    async interactive() {
        throw new Error('Interactive mode is not supported for Claude API agent via CLI interface yet. Provide a prompt directly.');
    }
    async isAvailable() {
        return !!this.apiKey;
    }
}
