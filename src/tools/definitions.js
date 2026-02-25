/**
 * ─── Shared Tool Definitions ──────────────────────────────────────
 *
 * All tools available to API-based and local agents are defined once
 * here in a canonical format. Converter functions translate them into
 * the specific JSON schemas required by each provider.
 *
 * To add a new tool:
 *   1. Add an entry to TOOL_CATALOG below.
 *   2. Add the execution logic in executor.js.
 *   That's it — every agent picks it up automatically.
 */

// ── Canonical tool catalog ───────────────────────────────────────
// Each tool has: name, description, parameters (JSON Schema props + required)

export const TOOL_CATALOG = [
    {
        name: 'list_files',
        description:
            'List all available project files in the current working directory. Returns file paths only. Use this to discover what files exist before reading them.',
        parameters: {
            properties: {},
            required: [],
        },
    },
    {
        name: 'read_file',
        description:
            'Read the contents of a specific project file. Use this to inspect source code, configs, data files, etc.',
        parameters: {
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file, e.g. "src/ui/banner.js"',
                },
            },
            required: ['path'],
        },
    },
    {
        name: 'run_command',
        description:
            'Execute a minigeri command and get its output. Use this to interact with services, check status, send messages, query other AI agents, etc. See the commands instruction file for the full list of available commands.',
        parameters: {
            properties: {
                command: {
                    type: 'string',
                    description: 'The full command string to execute, e.g. "folder", "status", "slack channels", "tg send 123 Hello"',
                },
            },
            required: ['command'],
        },
    },
];

// ── Format converters ────────────────────────────────────────────

/**
 * Convert to OpenAI / Groq / Ollama function-calling format.
 * Used by agents that follow the OpenAI chat completions schema.
 */
export function toOpenAITools() {
    return TOOL_CATALOG.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required,
            },
        },
    }));
}

/**
 * Convert to Anthropic (Claude API) tool format.
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export function toAnthropicTools() {
    return TOOL_CATALOG.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
            type: 'object',
            properties: tool.parameters.properties,
            required: tool.parameters.required,
        },
    }));
}

/**
 * Convert to Google Gemini function-calling format.
 * https://ai.google.dev/gemini-api/docs/function-calling
 */
export function toGeminiTools() {
    return [
        {
            functionDeclarations: TOOL_CATALOG.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'OBJECT',
                    properties: Object.fromEntries(
                        Object.entries(tool.parameters.properties).map(([key, val]) => [
                            key,
                            { type: val.type.toUpperCase(), description: val.description },
                        ])
                    ),
                    required: tool.parameters.required,
                },
            })),
        },
    ];
}
