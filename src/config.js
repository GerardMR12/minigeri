import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(homedir(), '.cli-bot');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    defaultAgent: process.env.DEFAULT_AGENT || 'claude-code',
    claudeMode: process.env.CLAUDE_MODE || 'cli', // 'cli' or 'api'
    geminiMode: process.env.GEMINI_MODE || 'cli', // 'cli' or 'api'
    agents: {
        'claude-code': {
            type: 'cli',
            command: process.env.CLAUDE_CODE_PATH || 'claude',
            description: 'Claude Code — Anthropic\'s coding agent',
        },
        'claude-api': {
            type: 'api',
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
            description: 'Claude API — Anthropic Messages API',
        },
        'gemini-cli': {
            type: 'cli',
            command: process.env.GEMINI_CLI_PATH || 'gemini',
            description: 'Gemini CLI — Google\'s AI assistant',
        },
        'gemini-api': {
            type: 'api',
            apiKey: process.env.GOOGLE_API_KEY || '',
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            description: 'Gemini API — Google Generative Language API',
        },
        'ollama': {
            type: 'cli',
            command: process.env.OLLAMA_PATH || 'ollama',
            model: process.env.OLLAMA_MODEL || 'llama3',
            description: 'Ollama — Local LLMs',
        },
        'groq': {
            type: 'api',
            apiKey: process.env.GROQ_API_KEY || '',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            description: 'Groq — Blazing-fast cloud inference',
        },
    },
    history: {
        maxEntries: 100,
        saveHistory: true,
    },
    slackBotToken: process.env.SLACK_BOT_TOKEN || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramAllowedUsers: process.env.TELEGRAM_ALLOWED_USERS || '',
    theme: 'default',
};

export function ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

export function loadConfig() {
    ensureConfigDir();
    if (existsSync(CONFIG_FILE)) {
        try {
            const raw = readFileSync(CONFIG_FILE, 'utf-8');
            const saved = JSON.parse(raw);

            // Deep-merge agents so defaults are always preserved
            const mergedAgents = { ...DEFAULT_CONFIG.agents };
            if (saved.agents) {
                for (const [name, overrides] of Object.entries(saved.agents)) {
                    mergedAgents[name] = { ...(mergedAgents[name] || {}), ...overrides };
                }
            }

            return { ...DEFAULT_CONFIG, ...saved, agents: mergedAgents };
        } catch {
            return { ...DEFAULT_CONFIG };
        }
    }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config) {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function syncConfigToEnv() {
    const config = loadConfig();
    if (config.agents['claude-api']?.apiKey) process.env.ANTHROPIC_API_KEY = config.agents['claude-api'].apiKey;
    if (config.agents['gemini-api']?.apiKey) process.env.GOOGLE_API_KEY = config.agents['gemini-api'].apiKey;
    if (config.agents['groq']?.apiKey) process.env.GROQ_API_KEY = config.agents['groq'].apiKey;
    if (config.slackBotToken) process.env.SLACK_BOT_TOKEN = config.slackBotToken;
    if (config.telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = config.telegramBotToken;
    if (config.telegramAllowedUsers) process.env.TELEGRAM_ALLOWED_USERS = config.telegramAllowedUsers;
}

export function getAgent(name) {
    const config = loadConfig();
    const agentName = name || config.defaultAgent;
    const agent = config.agents[agentName];
    if (!agent) {
        throw new Error(`Unknown agent: "${agentName}". Available: ${Object.keys(config.agents).join(', ')}`);
    }
    return { name: agentName, ...agent };
}

export { CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG };
