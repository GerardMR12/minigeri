import https from 'https';
import { BaseAgent } from './base.js';
import { toAnthropicTools, executeTool } from '../tools/index.js';

/**
 * Claude API Agent
 * Uses the Anthropic Messages API with tool use.
 */
export class ClaudeApiAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-api', config);
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.model = config.model || 'claude-3-7-sonnet-20250219';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    }

    async send(message, options = {}) {
        if (!this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
        }

        const silent = options.silent || false;
        this.messages.push({ role: 'user', content: message });

        // Build file-tree system context
        const systemContext = this.buildSystemContext();

        // Shared tools in Anthropic format
        const tools = toAnthropicTools();

        // Tool-calling loop
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const result = await this._callApi(this.messages, {
                system: systemContext,
                tools,
                silent,
            });

            // If the model returned tool calls, execute them and loop
            if (result.toolUse && result.toolUse.length > 0) {
                // Add the assistant's response (may contain text + tool_use blocks)
                this.messages.push({
                    role: 'assistant',
                    content: result.contentBlocks,
                });

                // Execute each tool and collect results
                const toolResults = [];
                for (const tu of result.toolUse) {
                    if (!silent) this.logToolCall(tu.name, tu.input || {});

                    const toolResult = executeTool(tu.name, tu.input || {});
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tu.id,
                        content: toolResult,
                    });
                }

                this.messages.push({ role: 'user', content: toolResults });
                continue;
            }

            // No tool calls — final text response
            if (result.text) {
                this.messages.push({ role: 'assistant', content: result.text });
            }
            return result.text;
        }

        return '';
    }

    /**
     * Call the Anthropic Messages API once (streaming).
     * @private
     */
    _callApi(messages, { system, tools, silent = false }) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: this.model,
                max_tokens: 4096,
                messages,
                stream: true,
                ...(system ? { system } : {}),
                ...(tools && tools.length > 0 ? { tools } : {}),
            });

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
                        'anthropic-version': '2023-06-01',
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
                                reject(new Error(`Anthropic API error (${res.statusCode}): ${parsed.error?.message || errorBody}`));
                            } catch {
                                reject(new Error(`Anthropic API error (${res.statusCode}): ${errorBody}`));
                            }
                        });
                        return;
                    }

                    let fullText = '';
                    let buffer = '';
                    const contentBlocks = [];   // Track all content blocks
                    const toolUseBlocks = [];   // Track tool_use blocks
                    let currentToolUse = null;
                    let toolInputJson = '';

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

                                // Text delta
                                if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                                    const token = json.delta.text;
                                    fullText += token;
                                    if (!silent) process.stdout.write(token);
                                }

                                // Tool use start
                                if (json.type === 'content_block_start' && json.content_block?.type === 'tool_use') {
                                    currentToolUse = {
                                        type: 'tool_use',
                                        id: json.content_block.id,
                                        name: json.content_block.name,
                                        input: {},
                                    };
                                    toolInputJson = '';
                                }

                                // Tool use input delta
                                if (json.type === 'content_block_delta' && json.delta?.type === 'input_json_delta') {
                                    toolInputJson += json.delta.partial_json || '';
                                }

                                // Content block stop — finalize if it was a tool_use
                                if (json.type === 'content_block_stop' && currentToolUse) {
                                    try {
                                        currentToolUse.input = JSON.parse(toolInputJson || '{}');
                                    } catch {
                                        currentToolUse.input = {};
                                    }
                                    toolUseBlocks.push(currentToolUse);
                                    contentBlocks.push(currentToolUse);
                                    currentToolUse = null;
                                    toolInputJson = '';
                                }

                                // Text block start
                                if (json.type === 'content_block_start' && json.content_block?.type === 'text') {
                                    // Will be accumulated via text_delta events
                                }
                            } catch { }
                        }
                    });

                    res.on('end', () => {
                        // Add any accumulated text as a text block
                        if (fullText) {
                            contentBlocks.unshift({ type: 'text', text: fullText });
                        }

                        resolve({
                            text: fullText,
                            toolUse: toolUseBlocks.length > 0 ? toolUseBlocks : null,
                            contentBlocks,
                        });
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
        throw new Error('Interactive mode is not supported for Claude API agent. Provide a prompt directly.');
    }

    async isAvailable() {
        return !!this.apiKey;
    }
}
