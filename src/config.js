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
    agents: {
        'claude-code': {
            type: 'cli',
            command: process.env.CLAUDE_CODE_PATH || 'claude',
            description: 'Claude Code — Anthropic\'s coding agent',
        },
        'gemini-cli': {
            type: 'cli',
            command: process.env.GEMINI_CLI_PATH || 'gemini',
            description: 'Gemini CLI — Google\'s AI assistant',
        },
    },
    history: {
        maxEntries: 100,
        saveHistory: true,
    },
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
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
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
