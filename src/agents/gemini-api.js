import https from 'https';
import { BaseAgent } from './base.js';

export class GeminiApiAgent extends BaseAgent {
    constructor(config = {}) {
        super('gemini-api', config);
        this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || '';
        this.model = config.model || 'gemini-1.5-flash';
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';

        // Conversation history: array of { role: 'user'|'model', parts: [{text: string}] }
        this.messages = [];
    }

    async send(message, options = {}) {
        if (!this.apiKey) {
            throw new Error('GOOGLE_API_KEY is not set. Add it to your .env file.');
        }

        const silent = options.silent || false;

        // Gemini expects alternating roles starting with 'user'
        this.messages.push({ role: 'user', parts: [{ text: message }] });

        const body = JSON.stringify({
            contents: this.messages,
        });

        return new Promise((resolve, reject) => {
            const url = new URL(`/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`, this.baseUrl);
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
                        res.on('data', (c) => errorBody += c);
                        res.on('end', () => {
                            this.messages.pop(); // Remove the user message
                            try {
                                const parsed = JSON.parse(errorBody);
                                reject(new Error(`Gemini API error (${res.statusCode}): ${parsed.error?.message || errorBody}`));
                            } catch {
                                reject(new Error(`Gemini API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

                    let fullResponse = '';
                    let buffer = '';

                    res.on('data', (chunk) => {
                        buffer += chunk.toString();

                        // Try to parse the buffer as an array of JSON objects sent progressively
                        try {
                            // Quick simplistic parsing for Gemini SSE streaming format
                            // The stream chunks are usually arrays that we can extract content from
                            const extractText = (str) => {
                                const matches = str.match(/"text":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g);
                                return matches ? matches.map(m => JSON.parse('{' + m + '}').text).join('') : '';
                            };

                            // Let's just accumulate the text, but wait until the end to be safe if silent
                            if (!silent) {
                                // Extract and print diffs. Since this is complex with JSON chunks, 
                                // we will just wait until 'end' for the history, but stream what we can parse.
                                // A safe but noisy way is to print words as they arrive if possible.
                                // For gemini API without heavy JSON parsers, we will aggregate it.
                            }
                        } catch { }
                    });

                    res.on('end', () => {
                        try {
                            // Strip SSE framing if any, or parse the whole string as JSON array of objects
                            // The stream format for Gemini often is an array of response chunks:
                            // [
                            //   { "candidates": [ ... ] },
                            //   ...
                            // ]
                            let contentToParse = buffer.trim();
                            // Sometimes it is sent as multiple JSON fragments without brackets
                            // Just a naive regex to extract all "text" fields
                            const jsonStrings = contentToParse.match(/"text":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g) || [];

                            for (const jsonLine of jsonStrings) {
                                try {
                                    const parsedObj = JSON.parse('{' + jsonLine + '}');
                                    if (parsedObj.text) {
                                        fullResponse += parsedObj.text;
                                    }
                                } catch { }
                            }

                            // If regex parsing failed, try parsing the whole thing
                            if (!fullResponse && contentToParse) {
                                try {
                                    const arr = JSON.parse(contentToParse);
                                    if (Array.isArray(arr)) {
                                        for (const item of arr) {
                                            const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
                                            if (text) fullResponse += text;
                                        }
                                    } else if (arr.candidates) {
                                        const text = arr.candidates[0]?.content?.parts?.[0]?.text;
                                        if (text) fullResponse += text;
                                    }
                                } catch {
                                    // If both fail, let's just log
                                }
                            }

                            if (fullResponse) {
                                if (!silent) process.stdout.write(fullResponse);
                                this.messages.push({ role: 'model', parts: [{ text: fullResponse }] });
                                resolve(fullResponse);
                            } else {
                                this.messages.pop();
                                reject(new Error('No content returned from Gemini'));
                            }
                        } catch (err) {
                            this.messages.pop();
                            reject(err);
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

    clearHistory() {
        this.messages = [];
    }
    getHistoryStats() {
        const userMessages = this.messages.filter(m => m.role === 'user').length;
        return { turns: userMessages, messages: this.messages.length };
    }
    async interactive() {
        throw new Error('Interactive mode is not supported for Gemini API agent via CLI interface yet. Provide a prompt directly.');
    }
    async isAvailable() {
        return !!this.apiKey;
    }
}
