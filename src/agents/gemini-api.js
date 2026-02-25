import https from 'https';
import { BaseAgent } from './base.js';
import { toGeminiTools, executeTool } from '../tools/index.js';

/**
 * Gemini API Agent
 * Uses the Google Generative Language API with function calling.
 */
export class GeminiApiAgent extends BaseAgent {
    constructor(config = {}) {
        super('gemini-api', config);
        this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || '';
        this.model = config.model || 'gemini-2.5-flash';
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    }

    async send(message, options = {}) {
        if (!this.apiKey) {
            throw new Error('GOOGLE_API_KEY is not set. Add it to your .env file.');
        }

        const silent = options.silent || false;

        // Gemini expects alternating roles starting with 'user'
        this.messages.push({ role: 'user', parts: [{ text: message }] });

        // Build file-tree system context
        const systemContext = this.buildSystemContext();

        // Shared tools in Gemini format
        const tools = toGeminiTools();

        // Tool-calling loop
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const result = await this._callApi(this.messages, {
                systemInstruction: systemContext,
                tools,
                silent,
            });

            // If the model returned function calls, execute them and loop
            if (result.functionCalls && result.functionCalls.length > 0) {
                // Add the model's response with function calls to history
                this.messages.push({
                    role: 'model',
                    parts: result.functionCalls.map((fc) => ({
                        functionCall: { name: fc.name, args: fc.args },
                    })),
                });

                // Execute tools and add function responses
                const responseParts = [];
                for (const fc of result.functionCalls) {
                    if (!silent) this.logToolCall(fc.name, fc.args || {});

                    const toolResult = executeTool(fc.name, fc.args || {});
                    responseParts.push({
                        functionResponse: {
                            name: fc.name,
                            response: { result: toolResult },
                        },
                    });
                }

                this.messages.push({ role: 'user', parts: responseParts });
                continue;
            }

            // No function calls — final text response
            if (result.text) {
                if (!silent) process.stdout.write(result.text);
                this.messages.push({ role: 'model', parts: [{ text: result.text }] });
            }
            return result.text;
        }

        return '';
    }

    /**
     * Get history stats — Gemini uses 'model' instead of 'assistant'.
     */
    getHistoryStats() {
        return super.getHistoryStats('user');
    }

    /**
     * Call the Gemini API once (non-streaming for reliable function-call parsing).
     * @private
     */
    _callApi(contents, { systemInstruction, tools, silent = false }) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                contents,
                ...(systemInstruction
                    ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
                    : {}),
                ...(tools && tools.length > 0 ? { tools } : {}),
            });

            const url = new URL(
                `/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
                this.baseUrl
            );

            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let errorBody = '';
                        res.on('data', (c) => (errorBody += c));
                        res.on('end', () => {
                            this.messages.pop();
                            try {
                                const parsed = JSON.parse(errorBody);
                                reject(
                                    new Error(
                                        `Gemini API error (${res.statusCode}): ${parsed.error?.message || errorBody}`
                                    )
                                );
                            } catch {
                                reject(new Error(`Gemini API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

                    let responseBody = '';

                    res.on('data', (chunk) => {
                        responseBody += chunk.toString();
                    });

                    res.on('end', () => {
                        try {
                            const json = JSON.parse(responseBody);
                            const candidate = json.candidates?.[0];
                            const parts = candidate?.content?.parts || [];

                            // Check for function calls
                            const functionCalls = parts
                                .filter((p) => p.functionCall)
                                .map((p) => ({
                                    name: p.functionCall.name,
                                    args: p.functionCall.args || {},
                                }));

                            if (functionCalls.length > 0) {
                                resolve({ text: '', functionCalls });
                                return;
                            }

                            // Extract text
                            const text = parts
                                .filter((p) => p.text)
                                .map((p) => p.text)
                                .join('');

                            if (text) {
                                resolve({ text, functionCalls: null });
                            } else {
                                this.messages.pop();
                                reject(new Error('No content returned from Gemini'));
                            }
                        } catch (err) {
                            this.messages.pop();
                            reject(new Error(`Failed to parse Gemini response: ${err.message}`));
                        }
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

    async interactive() {
        throw new Error('Interactive mode is not supported for Gemini API agent. Provide a prompt directly.');
    }

    async isAvailable() {
        return !!this.apiKey;
    }
}
