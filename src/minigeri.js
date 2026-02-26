#!/usr/bin/env node

import readline from 'readline';
import http from 'http';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';

import chalk from 'chalk';

import { colors, icons, setTheme, palettes } from './ui/theme.js';
import { showBanner } from './ui/banner.js';
import { showHelp } from './ui/help.js';
import { createAgent, listAgentNames } from './agents/index.js';
import { loadConfig, getAgent, saveConfig, syncConfigToEnv } from './config.js';
import { waConnect, waSend, waStatus, waDisconnect } from './services/whatsapp.js';
import {
    slackConnect, slackAutoConnect, slackSend, slackRead,
    slackChannels, slackStatus, slackDisconnect,
} from './services/slack.js';
import {
    tgConnect, tgAutoConnect, tgSend, tgChats,
    tgStatus, tgDisconnect,
} from './services/telegram.js';
import { handleNgrok, stopNgrok, isNgrokRunning } from './services/ngrok.js';
import { registerCommand } from './tools/command-runner.js';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
syncConfigToEnv();

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// Initialize theme
const currentConfig = loadConfig();
if (currentConfig.theme) {
    setTheme(currentConfig.theme);
}

// ─── Command Handlers ─────────────────────────────────────────────

async function handleClaude(args, rl) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'mode' || subcommand === 'use') {
        const mode = args[1]?.toLowerCase();
        if (mode !== 'cli' && mode !== 'api') {
            console.log(colors.warning(`\n  Usage: ${colors.claude('claude mode <cli|api>')}\n`));
            return;
        }
        const config = loadConfig();
        config.claudeMode = mode;
        saveConfig(config);
        console.log(`\n  ${colors.success(icons.check)} Active Claude mode set to ${colors.claude.bold(mode)}\n`);
        return;
    }

    const prompt = args.join(' ').trim();
    const config = loadConfig();
    const isApi = config.claudeMode === 'api';
    const agentName = isApi ? 'claude-api' : 'claude-code';

    const agentConfig = getAgent(agentName);
    const agent = createAgent(agentName, agentConfig);

    const available = await agent.isAvailable();
    if (!available) {
        if (isApi) {
            console.log(colors.error(`  ${icons.cross} ANTHROPIC_API_KEY is not set.`));
        } else {
            console.log(colors.error(`  ${icons.cross} Claude Code is not installed or not in PATH`));
        }
        return;
    }

    if (!prompt) {
        console.log(colors.claude(`\n  ${icons.spark} Launching Claude Code interactive mode...`));
        console.log(colors.muted('  (You\'ll return here when you exit Claude)\n'));

        rl.pause();
        try {
            await agent.interactive();
        } catch (err) {
            console.log(colors.error(`  ${icons.cross} Error: ${err.message}`));
        }
        console.log(colors.muted(`\n  ${icons.check} Back to minigeri\n`));
        rl.resume();
        rl.prompt();
        return;
    }

    console.log(colors.claude(`\n  ${icons.spark} Asking Claude...`));
    console.log(colors.muted('  ─────────────────────────────────────────────\n'));
    try {
        await agent.send(prompt);
        console.log(colors.muted('\n  ─────────────────────────────────────────────'));
    } catch (err) {
        console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}`));
    }
    console.log('');
}

async function handleGemini(args, rl) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'mode' || subcommand === 'use') {
        const mode = args[1]?.toLowerCase();
        if (mode !== 'cli' && mode !== 'api') {
            console.log(colors.warning(`\n  Usage: ${colors.gemini('gemini mode <cli|api>')}\n`));
            return;
        }
        const config = loadConfig();
        config.geminiMode = mode;
        saveConfig(config);
        console.log(`\n  ${colors.success(icons.check)} Active Gemini mode set to ${colors.gemini.bold(mode)}\n`);
        return;
    }

    const prompt = args.join(' ').trim();
    const config = loadConfig();
    const isApi = config.geminiMode === 'api';
    const agentName = isApi ? 'gemini-api' : 'gemini-cli';

    const agentConfig = getAgent(agentName);
    const agent = createAgent(agentName, agentConfig);

    const available = await agent.isAvailable();
    if (!available) {
        if (isApi) {
            console.log(colors.error(`  ${icons.cross} GOOGLE_API_KEY is not set.`));
        } else {
            console.log(colors.error(`  ${icons.cross} Gemini CLI is not installed or not in PATH`));
        }
        return;
    }

    if (!prompt) {
        console.log(colors.gemini(`\n  ${icons.spark} Launching Gemini CLI interactive mode...`));
        console.log(colors.muted('  (You\'ll return here when you exit Gemini)\n'));

        rl.pause();
        try {
            await agent.interactive();
        } catch (err) {
            console.log(colors.error(`  ${icons.cross} Error: ${err.message}`));
        }
        console.log(colors.muted(`\n  ${icons.check} Back to minigeri\n`));
        rl.resume();
        rl.prompt();
        return;
    }

    console.log(colors.gemini(`\n  ${icons.spark} Asking Gemini...`));
    console.log(colors.muted('  ─────────────────────────────────────────────\n'));
    try {
        await agent.send(prompt);
        console.log(colors.muted('\n  ─────────────────────────────────────────────'));
    } catch (err) {
        console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}`));
    }
    console.log('');
}

// Persistent Ollama agent — keeps conversation history alive across calls
let ollamaAgent = null;
let ollamaModelName = null;

function getOllamaAgent() {
    const agentConfig = getAgent('ollama');
    // Recreate agent if model changed
    if (!ollamaAgent || ollamaModelName !== agentConfig.model) {
        ollamaAgent = createAgent('ollama', agentConfig);
        ollamaModelName = agentConfig.model;
    }
    return { agent: ollamaAgent, agentConfig };
}

async function handleOllama(args, rl) {
    const subcommand = args[0]?.toLowerCase();
    const { agent, agentConfig } = getOllamaAgent();

    const available = await agent.isAvailable();
    if (!available) {
        console.log(colors.error(`  ${icons.cross} Ollama is not installed or not in PATH`));
        return;
    }

    // ── Subcommands ──
    switch (subcommand) {
        // List all downloaded models
        case 'models':
        case 'list':
        case 'ls': {
            console.log(`\n  ${colors.ollama.bold('Local Models')}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            try {
                const { models } = await agent.listModels();
                if (models.length === 0) {
                    console.log(colors.muted('  No models found. Use ') + colors.ollama('ollama pull <model>') + colors.muted(' to download one.'));
                } else {
                    for (const m of models) {
                        const isCurrent = m.name.replace(/:latest$/, '') === agentConfig.model.replace(/:latest$/, '');
                        const marker = isCurrent ? colors.success(icons.check) : ' ';
                        console.log(`  ${marker} ${colors.ollama.bold(m.name.padEnd(28))} ${colors.muted(m.size.padEnd(10))} ${colors.muted(m.modified)}`);
                    }
                }
            } catch (err) {
                console.log(colors.error(`  ${icons.cross} ${err.message}`));
            }
            console.log('');
            break;
        }


        // Switch the active model
        case 'use':
        case 'set': {
            const modelName = args[1];
            if (!modelName) {
                console.log(colors.warning(`\n  Usage: ${colors.ollama('ollama use <model_name>')}`));
                console.log(colors.muted('  Example: ollama use mistral'));
                console.log(colors.muted('  Tip: Use ') + colors.ollama('ollama models') + colors.muted(' to see available models\n'));
                return;
            }
            // Verify the model exists locally
            try {
                const { models } = await agent.listModels();
                const normalised = modelName.replace(/:latest$/, '');
                const found = models.some(m => m.name.replace(/:latest$/, '') === normalised);
                if (!found) {
                    console.log(colors.warning(`\n  ${icons.cross} Model "${modelName}" not found locally.`));
                    console.log(colors.muted('  Available models:'));
                    for (const m of models) {
                        console.log(colors.muted(`    • ${m.name}`));
                    }
                    console.log(colors.muted('  Use ') + colors.ollama(`ollama pull ${modelName}`) + colors.muted(' to download it first.\n'));
                    return;
                }
            } catch {
                // If listing fails, let the user switch anyway
            }
            const config = loadConfig();
            if (!config.agents) config.agents = {};
            if (!config.agents.ollama) config.agents.ollama = {};
            config.agents.ollama.model = modelName;
            saveConfig(config);
            // Force agent recreation on next call with the new model
            ollamaAgent = null;
            ollamaModelName = null;
            console.log(`\n  ${colors.success(icons.check)} Active model set to ${colors.ollama.bold(modelName)}`);
            console.log(colors.muted('  Conversation history has been reset.\n'));
            break;
        }

        // Pull (download) a model
        case 'pull':
        case 'download': {
            const modelName = args[1];
            if (!modelName) {
                console.log(colors.warning(`\n  Usage: ${colors.ollama('ollama pull <model_name>')}`));
                console.log(colors.muted('  Example: ollama pull mistral\n'));
                return;
            }
            console.log(colors.ollama(`\n  ${icons.llama} Pulling model ${colors.ollama.bold(modelName)}...`));
            console.log(colors.muted('  ─────────────────────────────────────────────\n'));
            rl.pause();
            try {
                await agent.pullModel(modelName);
                console.log(`\n  ${colors.success(icons.check)} Model ${colors.ollama.bold(modelName)} downloaded successfully\n`);
            } catch (err) {
                console.log(colors.error(`\n  ${icons.cross} ${err.message}\n`));
            }
            rl.resume();
            rl.prompt();
            return;
        }

        // Remove a model
        case 'rm':
        case 'remove':
        case 'delete': {
            const modelName = args[1];
            if (!modelName) {
                console.log(colors.warning(`\n  Usage: ${colors.ollama('ollama rm <model_name>')}`));
                console.log(colors.muted('  Example: ollama rm mistral\n'));
                return;
            }
            try {
                await agent.removeModel(modelName);
                console.log(`\n  ${colors.success(icons.check)} Model ${colors.ollama.bold(modelName)} removed\n`);
            } catch (err) {
                console.log(colors.error(`\n  ${icons.cross} ${err.message}\n`));
            }
            break;
        }

        // List currently running models
        case 'ps':
        case 'running': {
            console.log(`\n  ${colors.ollama.bold('Running Models')}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            try {
                const output = await agent.listRunning();
                const lines = output.split('\n');
                if (lines.length <= 1) {
                    console.log(colors.muted('  No models currently running'));
                } else {
                    for (const line of lines) {
                        console.log(`  ${colors.text(line)}`);
                    }
                }
            } catch (err) {
                console.log(colors.error(`  ${icons.cross} ${err.message}`));
            }
            console.log('');
            break;
        }

        // Clear conversation history
        case 'clear':
        case 'reset': {
            agent.clearHistory();
            console.log(`\n  ${colors.success(icons.check)} Conversation history cleared\n`);
            break;
        }

        // Show conversation history
        case 'history':
        case 'ctx': {
            const stats = agent.getHistoryStats();
            console.log(`\n  ${colors.ollama.bold('Conversation History')} ${colors.muted('—')} ${colors.ollama(agentConfig.model)}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            if (stats.turns === 0) {
                console.log(colors.muted('  No conversation yet. Send a prompt to start chatting.'));
            } else {
                console.log(colors.muted(`  ${stats.turns} turn(s), ${stats.messages} message(s)\n`));
                for (const msg of agent.messages) {
                    if (msg.role === 'user') {
                        console.log(`  ${colors.accent.bold('You:')} ${colors.text(msg.content)}`);
                    } else if (msg.role === 'assistant') {
                        // Truncate long responses for the overview
                        const preview = msg.content.length > 200
                            ? msg.content.substring(0, 200) + '...'
                            : msg.content;
                        console.log(`  ${colors.ollama.bold('Ollama:')} ${colors.muted(preview)}`);
                    }
                    console.log('');
                }
            }
            console.log('');
            break;
        }

        // No subcommand → interactive mode
        case undefined: {
            console.log(colors.ollama(`\n  ${icons.llama} Launching Ollama interactive mode (${agentConfig.model})...`));
            console.log(colors.muted('  (You\'ll return here when you exit Ollama)\n'));

            rl.pause();
            try {
                await agent.interactive();
            } catch (err) {
                console.log(colors.error(`  ${icons.cross} Error: ${err.message}`));
            }
            console.log(colors.muted(`\n  ${icons.check} Back to minigeri\n`));
            rl.resume();
            rl.prompt();
            return;
        }

        // Anything else → treat as a prompt (with conversation context)
        default: {
            const prompt = args.join(' ').trim();
            const stats = agent.getHistoryStats();
            const ctxLabel = stats.turns > 0
                ? colors.muted(` (turn ${stats.turns + 1}, with context)`)
                : '';
            console.log(colors.ollama(`\n  ${icons.llama} Asking Ollama (${agentConfig.model})...`) + ctxLabel);
            console.log(colors.muted('  ─────────────────────────────────────────────\n'));
            try {
                await agent.send(prompt);
                console.log(colors.muted('\n\n  ─────────────────────────────────────────────'));
            } catch (err) {
                console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}`));
            }
            console.log('');
            break;
        }
    }
}

// ── Groq ───────────────────────────────────────────────────────────

let groqAgent = null;
let groqModelName = null;

function getGroqAgent() {
    const agentConfig = getAgent('groq');
    // Recreate agent if model changed
    if (!groqAgent || groqModelName !== agentConfig.model) {
        groqAgent = createAgent('groq', agentConfig);
        groqModelName = agentConfig.model;
    }
    return { agent: groqAgent, agentConfig };
}

async function handleGroq(args, rl) {
    const subcommand = args[0]?.toLowerCase();
    const { agent, agentConfig } = getGroqAgent();

    const available = await agent.isAvailable();
    if (!available) {
        console.log(colors.error(`\n  ${icons.cross} GROQ_API_KEY is not set.`));
        console.log(colors.muted('  Get a free key at: ') + colors.groq('https://console.groq.com/keys'));
        console.log(colors.muted('  Then add ') + colors.text('GROQ_API_KEY=gsk_...') + colors.muted(' to your .env file\n'));
        return;
    }

    switch (subcommand) {
        // List available models
        case 'models':
        case 'list':
        case 'ls': {
            console.log(`\n  ${colors.groq.bold('Available Groq Models')}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            try {
                const { models } = await agent.listModels();
                if (models.length === 0) {
                    console.log(colors.muted('  No models available.'));
                } else {
                    for (const m of models) {
                        const isCurrent = m.id === agentConfig.model;
                        const marker = isCurrent ? colors.success(icons.check) : ' ';
                        console.log(`  ${marker} ${colors.groq.bold(m.id.padEnd(36))} ${colors.muted(m.owned_by)}`);
                    }
                }
            } catch (err) {
                console.log(colors.error(`  ${icons.cross} ${err.message}`));
            }
            console.log('');
            break;
        }

        // Switch the active model
        case 'use':
        case 'set': {
            const modelName = args[1];
            if (!modelName) {
                console.log(colors.warning(`\n  Usage: ${colors.groq('groq use <model_name>')}`));
                console.log(colors.muted('  Example: groq use llama-3.1-8b-instant'));
                console.log(colors.muted('  Tip: Use ') + colors.groq('groq models') + colors.muted(' to see available models\n'));
                return;
            }
            const config = loadConfig();
            if (!config.agents) config.agents = {};
            if (!config.agents.groq) config.agents.groq = {};
            config.agents.groq.model = modelName;
            saveConfig(config);
            // Force agent recreation on next call with the new model
            groqAgent = null;
            groqModelName = null;
            console.log(`\n  ${colors.success(icons.check)} Active model set to ${colors.groq.bold(modelName)}`);
            console.log(colors.muted('  Conversation history has been reset.\n'));
            break;
        }

        // Clear conversation history
        case 'clear':
        case 'reset': {
            agent.clearHistory();
            console.log(`\n  ${colors.success(icons.check)} Conversation history cleared\n`);
            break;
        }

        // Show conversation history
        case 'history':
        case 'ctx': {
            const stats = agent.getHistoryStats();
            console.log(`\n  ${colors.groq.bold('Conversation History')} ${colors.muted('—')} ${colors.groq(agentConfig.model)}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            if (stats.turns === 0) {
                console.log(colors.muted('  No conversation yet. Send a prompt to start chatting.'));
            } else {
                console.log(colors.muted(`  ${stats.turns} turn(s), ${stats.messages} message(s)\n`));
                for (const msg of agent.messages) {
                    if (msg.role === 'user') {
                        console.log(`  ${colors.accent.bold('You:')} ${colors.text(msg.content)}`);
                    } else if (msg.role === 'assistant') {
                        const preview = msg.content.length > 200
                            ? msg.content.substring(0, 200) + '...'
                            : msg.content;
                        console.log(`  ${colors.groq.bold('Groq:')} ${colors.muted(preview)}`);
                    }
                    console.log('');
                }
            }
            console.log('');
            break;
        }

        // No subcommand → usage hint
        case undefined: {
            console.log(colors.groq(`\n  ${icons.spark} Groq — blazing-fast cloud inference`));
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            console.log(colors.muted('  Usage: ') + colors.groq('groq <prompt>'));
            console.log(colors.muted('  Example: ') + colors.text('groq What is the capital of France?\n'));
            break;
        }

        // Anything else → treat as a prompt (with conversation context)
        default: {
            const prompt = args.join(' ').trim();
            const stats = agent.getHistoryStats();
            const ctxLabel = stats.turns > 0
                ? colors.muted(` (turn ${stats.turns + 1}, with context)`)
                : '';
            console.log(colors.groq(`\n  ${icons.spark} Asking Groq (${agentConfig.model})...`) + ctxLabel);
            console.log(colors.muted('  ─────────────────────────────────────────────\n'));
            try {
                await agent.send(prompt);
                console.log(colors.muted('\n\n  ─────────────────────────────────────────────'));
            } catch (err) {
                console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}`));
            }
            console.log('');
            break;
        }
    }
}

// ── Octopus Mode ───────────────────────────────────────────────────

// Octopus mode state — when non-null, the shell is in octopus mode
let octopusState = null; // { agent, label, colorFn, target }

// Map user-facing command names to their agent resolution logic
const OCTOPUS_AGENTS = {
    groq: () => {
        const { agent, agentConfig } = getGroqAgent();
        return { agent, model: agentConfig.model, colorFn: colors.groq, label: 'Groq' };
    },
    ollama: () => {
        const { agent, agentConfig } = getOllamaAgent();
        return { agent, model: agentConfig.model, colorFn: colors.ollama, label: 'Ollama' };
    },
    claude: () => {
        const config = loadConfig();
        const isApi = config.claudeMode === 'api';
        const agentName = isApi ? 'claude-api' : 'claude-code';
        const agentConfig = getAgent(agentName);
        const agent = createAgent(agentName, agentConfig);
        return { agent, model: agentConfig.model || agentName, colorFn: colors.claude, label: 'Claude' };
    },
    gemini: () => {
        const config = loadConfig();
        const isApi = config.geminiMode === 'api';
        const agentName = isApi ? 'gemini-api' : 'gemini-cli';
        const agentConfig = getAgent(agentName);
        const agent = createAgent(agentName, agentConfig);
        return { agent, model: agentConfig.model || agentName, colorFn: colors.gemini, label: 'Gemini' };
    },
};

async function handleOctopus(args, rl) {
    const target = args[0]?.toLowerCase();

    if (!target || !OCTOPUS_AGENTS[target]) {
        const available = Object.keys(OCTOPUS_AGENTS).join(', ');
        console.log(`\n  ${colors.warning('Usage:')} ${colors.accent('octopus <agent>')}`);
        console.log(colors.muted(`  Available agents: ${available}`));
        console.log(colors.muted('  Example: ') + colors.text('octopus groq\n'));
        return;
    }

    // Resolve the agent
    const { agent, model, colorFn, label } = OCTOPUS_AGENTS[target]();

    // Check availability
    const available = await agent.isAvailable();
    if (!available) {
        console.log(colors.error(`\n  ${icons.cross} ${label} is not available. Check your configuration.\n`));
        return;
    }

    // Enter octopus mode — set state and change prompt
    console.log('');
    console.log(colorFn(`  ${icons.octopus} Entering Octopus Mode — ${label} (${model})`));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(colors.muted('  Everything you type is sent as a prompt.'));
    console.log(colors.muted(`  Type ${colors.accent('/exit')} to return to minigeri.\n`));

    octopusState = { agent, label, colorFn, target };

    // Switch prompt to octopus style
    rl.setPrompt(getPrompt());
}

async function handleWhatsApp(args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
        case 'connect':
            await waConnect();
            break;

        case 'send': {
            const to = args[1];
            const message = args.slice(2).join(' ');
            if (!to || !message) {
                console.log(colors.warning(`  Usage: ${colors.whatsapp('wa send <phone_number> <message>')}`));
                console.log(colors.muted('  Example: wa send 34612345678 Hello there!'));
                return;
            }
            await waSend(to, message);
            break;
        }

        case 'status':
            waStatus();
            break;

        case 'disconnect':
            await waDisconnect();
            break;

        default:
            console.log(colors.warning(`  Unknown WhatsApp command: ${subcommand || '(none)'}`));
            console.log(colors.muted('  Available: connect, send, status, disconnect'));
            break;
    }
}

async function handleSlack(args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
        case 'connect':
            await slackConnect();
            break;

        case 'send': {
            const channel = args[1];
            const message = args.slice(2).join(' ');
            if (!channel || !message) {
                console.log(colors.warning(`  Usage: ${colors.highlight('slack send <channel> <message>')}`));
                console.log(colors.muted('  Example: slack send general Hello team!'));
                return;
            }
            await slackSend(channel, message);
            break;
        }

        case 'read': {
            const channel = args[1];
            const count = parseInt(args[2]) || 10;
            if (!channel) {
                console.log(colors.warning(`  Usage: ${colors.highlight('slack read <channel> [count]')}`));
                console.log(colors.muted('  Example: slack read general 20'));
                return;
            }
            await slackRead(channel, count);
            break;
        }

        case 'channels':
        case 'ch':
            await slackChannels();
            break;

        case 'status':
            slackStatus();
            break;

        case 'disconnect':
            slackDisconnect();
            break;

        default:
            console.log(colors.warning(`  Unknown Slack command: ${subcommand || '(none)'}`));
            console.log(colors.muted('  Available: connect, send, read, channels, status, disconnect'));
            break;
    }
}

async function handleTelegram(args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
        case 'connect':
            await tgConnect();
            break;

        case 'send': {
            const chatId = args[1];
            const message = args.slice(2).join(' ');
            if (!chatId || !message) {
                console.log(colors.warning(`  Usage: ${colors.telegram('tg send <chat_id> <message>')}`));
                console.log(colors.muted('  Example: tg send 123456789 Hello there!'));
                console.log(colors.muted('  Tip: Use tg chats to find chat IDs'));
                return;
            }
            await tgSend(chatId, message);
            break;
        }

        case 'chats':
            tgChats();
            break;

        case 'status':
            tgStatus();
            break;

        case 'disconnect':
            await tgDisconnect();
            break;

        default:
            console.log(colors.warning(`  Unknown Telegram command: ${subcommand || '(none)'}`));
            console.log(colors.muted('  Available: connect, send, chats, status, disconnect'));
            break;
    }
}

async function handleFolder() {
    const cwd = process.cwd();
    console.log(`\n  ${colors.primary.bold('Current Directory')}`);
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.accent(icons.gear)} ${colors.text(cwd)}`);
    console.log('');
}

async function handleTheme(args, rl) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'list') {
        console.log(`\n  ${colors.primary.bold('Available Themes')}`);
        console.log(colors.muted('  ─────────────────────────────────────────────'));
        for (const [key, palette] of Object.entries(palettes)) {
            const isCurrent = (loadConfig().theme || 'default') === key;
            const marker = isCurrent ? colors.success(icons.check) : ' ';
            const preview = chalk.hex(palette.primary)('■') + ' ' +
                chalk.hex(palette.secondary)('■') + ' ' +
                chalk.hex(palette.accent)('■');
            console.log(`  ${marker} ${colors.text(key.padEnd(12))} ${preview}`);
        }
        console.log('');
    } else if (subcommand && Object.keys(palettes).includes(subcommand)) {
        setTheme(subcommand);
        const config = loadConfig();
        config.theme = subcommand;
        saveConfig(config);
        console.log(`\n  ${colors.success(icons.check)} Theme updated to ${colors.primary.bold(subcommand)}\n`);
        if (rl) {
            rl.setPrompt(getPrompt());
        }
    } else {
        console.log(`\n  ${colors.warning('Usage:')} ${colors.primary('theme list')} or ${colors.primary('theme <theme_id>')}`);
        console.log(`  ${colors.muted('Example:')} theme ocean\n`);
    }
}

// ─── Status & Shell ───────────────────────────────────────────────

async function handleConfig(args) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'set') {
        const key = args[1]?.toUpperCase();
        const value = args[2];

        if (!key || !value) {
            console.log(colors.warning(`\n  Usage: ${colors.primary('config set <KEY> <VALUE>')}`));
            console.log(colors.muted('  Example: config set ANTHROPIC_API_KEY sk-...\n'));
            return;
        }

        const config = loadConfig();
        
        // Map common env keys to config structure
        if (key === 'ANTHROPIC_API_KEY') {
            config.agents['claude-api'].apiKey = value;
        } else if (key === 'GOOGLE_API_KEY') {
            config.agents['gemini-api'].apiKey = value;
        } else if (key === 'GROQ_API_KEY') {
            config.agents['groq'].apiKey = value;
        } else if (key === 'SLACK_BOT_TOKEN') {
            config.slackBotToken = value;
        } else if (key === 'TELEGRAM_BOT_TOKEN') {
            config.telegramBotToken = value;
        } else {
            // Generic setting
            config[args[1]] = value;
        }

        saveConfig(config);
        syncConfigToEnv();
        console.log(`\n  ${colors.success(icons.check)} Configuration updated: ${colors.primary(key)} set.\n`);
        return;
    }

    if (subcommand === 'list' || subcommand === 'show') {
        const config = loadConfig();
        console.log(`\n  ${colors.primary.bold('Current Configuration')}`);
        console.log(colors.muted('  ─────────────────────────────────────────────'));
        
        console.log(`  ${colors.text('Claude API Key:')}   ${config.agents['claude-api']?.apiKey ? '********' : colors.muted('not set')}`);
        console.log(`  ${colors.text('Gemini API Key:')}   ${config.agents['gemini-api']?.apiKey ? '********' : colors.muted('not set')}`);
        console.log(`  ${colors.text('Groq API Key:')}     ${config.agents['groq']?.apiKey ? '********' : colors.muted('not set')}`);
        console.log(`  ${colors.text('Slack Token:')}      ${config.slackBotToken ? '********' : colors.muted('not set')}`);
        console.log(`  ${colors.text('Telegram Token:')}   ${config.telegramBotToken ? '********' : colors.muted('not set')}`);
        console.log('');
        return;
    }

    console.log(`\n  ${colors.warning('Usage:')} ${colors.primary('config <set|list>')}`);
    console.log(colors.muted('  Example: ') + colors.text('config set ANTHROPIC_API_KEY sk-...\n'));
}

async function handleStatus() {
    const config = loadConfig();
    const agentNames = listAgentNames();

    console.log('');
    console.log(colors.primary.bold('  Service Status'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));

    // AI Agents
    console.log(colors.text.bold('\n  AI Agents'));
    for (const name of agentNames) {
        const agentConfig = config.agents[name] || {};
        const agent = createAgent(name, agentConfig);
        const available = await agent.isAvailable();
        const status = available
            ? colors.success(`${icons.bullet} Available`)
            : colors.error(`${icons.circle} Not found`);

        let color;
        if (name === 'claude-code' || name === 'claude-api') color = colors.claude;
        else if (name === 'gemini-cli' || name === 'gemini-api') color = colors.gemini;
        else if (name === 'ollama') color = colors.ollama;
        else if (name === 'groq') color = colors.groq;
        else color = colors.primary;

        console.log(`  ${status}  ${color.bold(name)}`);
    }

    // Messaging
    console.log(colors.text.bold('\n  Messaging'));
    waStatus();
    tgStatus();
    slackStatus();
    console.log('');
}

function handleShellCommand(cmd) {
    return new Promise((resolve) => {
        console.log(colors.muted(`  $ ${cmd}\n`));
        const proc = spawn(cmd, {
            stdio: 'inherit',
            shell: true,
            cwd: process.cwd(),
        });
        proc.on('close', (code) => {
            if (code !== 0) {
                console.log(colors.muted(`\n  Exit code: ${code}`));
            }
            console.log('');
            resolve();
        });
        proc.on('error', (err) => {
            console.log(colors.error(`  ${icons.cross} ${err.message}`));
            resolve();
        });
    });
}

function getPrompt() {
    if (octopusState) {
        const { target, colorFn } = octopusState;
        return `  ${colors.primary(icons.octopus + ' octopus')} ${colors.primary('▸')} ${colorFn(target)} ${colorFn('▸')} `;
    }

    return `${colors.primary('  minigeri')} ${colors.primary('▸ ')}`;
}

function changeDirectory(target, rl) {
    const dir = target || process.env.HOME || process.env.USERPROFILE || '/';
    try {
        const resolved = resolve(process.cwd(), dir.replace(/^~(?=$|\/|\\)/, process.env.HOME || process.env.USERPROFILE || ''));
        process.chdir(resolved);

        const cwd = process.cwd();
        const home = process.env.HOME || process.env.USERPROFILE;
        let displayPath = cwd;
        if (home && cwd.startsWith(home)) {
            displayPath = '~' + cwd.slice(home.length).replace(/\\/g, '/');
        }

        const pathWithSlash = displayPath.endsWith('/') ? displayPath : `${displayPath}/`;
        console.log(colors.muted(`  changed to ${pathWithSlash}`));

        if (rl) {
            rl.setPrompt(getPrompt());
        }
        return true;
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Error: ${err.message}`));
        return false;
    }
}
// ─── Register commands for AI agent tool use ─────────────────────
// These registrations let agents execute minigeri commands via run_command.
// Handlers that need `rl` receive a null (they only use rl for interactive mode).

registerCommand('claude', (args) => handleClaude(args, null));
registerCommand('gemini', (args) => handleGemini(args, null));
registerCommand('ollama', (args) => handleOllama(args, null));
registerCommand('groq', (args) => handleGroq(args, null));
registerCommand('octopus', (args) => handleOctopus(args, null));
registerCommand('wa', (args) => handleWhatsApp(args));
registerCommand('slack', (args) => handleSlack(args));
registerCommand('tg', (args) => handleTelegram(args));
registerCommand('ngrok', (args) => handleNgrok(args));
registerCommand('folder', () => handleFolder());
registerCommand('status', () => handleStatus());
registerCommand('config', (args) => handleConfig(args));
registerCommand('theme', (args) => handleTheme(args, null));
registerCommand('cd', (args) => {
    const dir = args.join(' ') || process.env.HOME || '/';
    try {
        const resolved = resolve(process.cwd(), dir.replace(/^~(?=$|\/|\\)/, process.env.HOME || process.env.USERPROFILE || ''));
        process.chdir(resolved);
        return `Changed directory to ${process.cwd()}`;
    } catch (err) {
        return `Error: ${err.message}`;
    }
});

// ─── Main Interactive Shell ────────────────────────────────────────

async function main() {
    // Check if an initial directory argument was provided
    const args = process.argv.slice(2);
    if (args.length > 0) {
        const targetPath = resolve(process.cwd(), args[0]);
        if (existsSync(targetPath) && statSync(targetPath).isDirectory()) {
            // Change the process working directory
            process.chdir(targetPath);
        } else {
            console.error(colors.error(`  ${icons.cross} Error: Directory not found or is not a directory: ${args[0]}`));
            process.exit(1);
        }
    }

    console.clear();
    showBanner(pkg.version);

    // Auto-connect services if tokens are available
    await slackAutoConnect();
    await tgAutoConnect();

    console.log(colors.muted(`  ${icons.star} Hello! What can I do for you today?`));

    const commandsList = [
        'claude', 'claude mode cli', 'claude mode api',
        'gemini', 'gemini mode cli', 'gemini mode api',
        'ollama', 'ollama models', 'ollama use', 'ollama pull', 'ollama rm', 'ollama ps',
        'ollama clear', 'ollama history',
        'groq', 'groq models', 'groq use', 'groq history', 'groq clear',
        'octopus groq', 'octopus ollama', 'octopus claude', 'octopus gemini',
        'wa connect', 'wa send', 'wa status', 'wa disconnect',
        'slack connect', 'slack send', 'slack read', 'slack channels', 'slack status', 'slack disconnect',
        'tg connect', 'tg send', 'tg chats', 'tg status', 'tg disconnect',
        'ngrok', 'ngrok stop', 'ngrok status',
        'status', 'config set', 'config list', 'help', 'clear', 'exit', 'quit', 'folder', 'cd', 'theme <theme-id>', 'theme list',
    ].sort();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: getPrompt(),
        completer: (line) => {
            const hits = commandsList.filter((c) => c.startsWith(line.trim()));
            return [hits.length ? hits : commandsList, line];
        },
    });

    const MAX_VISIBLE = 4;
    let suggestionOffset = 0;
    let lastInputText = '';
    let isExecuting = false;

    // ── Selection mode state ──
    let inSelectionMode = false;
    let selectedIndex = 0;
    let savedInput = '';
    let currentHits = [];

    const originalRefresh = rl._refreshLine;
    rl._refreshLine = function () {
        originalRefresh.call(this);

        const text = this.line || '';
        const dist = text.length - this.cursor;
        const moveRight = dist > 0 ? `\x1B[${dist}C` : '';

        // Reset scroll position when the typed text changes (only in normal mode)
        if (!inSelectionMode && text.trim() !== lastInputText) {
            lastInputText = text.trim();
            suggestionOffset = 0;
        }

        if (text.trim().length > 0 && !this._hideGhostText && !octopusState) {
            const hits = inSelectionMode ? currentHits : commandsList.filter(c => c.startsWith(text.trim()));
            if (hits.length > 0) {
                // In selection mode, ensure selected item is visible
                if (inSelectionMode) {
                    if (selectedIndex < suggestionOffset) {
                        suggestionOffset = selectedIndex;
                    }
                    if (selectedIndex >= suggestionOffset + MAX_VISIBLE) {
                        suggestionOffset = selectedIndex - MAX_VISIBLE + 1;
                    }
                } else {
                    if (suggestionOffset > hits.length - MAX_VISIBLE) {
                        suggestionOffset = Math.max(0, hits.length - MAX_VISIBLE);
                    }
                }

                const visible = hits.slice(suggestionOffset, suggestionOffset + MAX_VISIBLE);
                const hasLeft = inSelectionMode && suggestionOffset > 0;
                const hasRight = inSelectionMode && suggestionOffset + MAX_VISIBLE < hits.length;

                let parts = '\x1b[90m';
                if (hasLeft) parts += '\x1b[37m◀ \x1b[90m';

                parts += visible.map((h, i) => {
                    const globalIdx = suggestionOffset + i;
                    if (inSelectionMode && globalIdx === selectedIndex) {
                        return `\x1b[1;97m${h}\x1b[0;90m`;  // Bold bright white for selected
                    }
                    return h;
                }).join(' \x1b[37m·\x1b[90m ');

                if (hasRight) parts += ' \x1b[37m▶\x1b[90m';

                const bracket = inSelectionMode ? '\x1b[33m' : '\x1b[90m';
                const hint = inSelectionMode ? '\x1b[33m↑ ' : '\x1b[90m↓ ';
                const suggestionString = `   ${hint}${bracket}[${parts}${bracket}]\x1b[0m`;
                this.output.write(`\x1B[s${moveRight}${suggestionString}\x1B[K\x1B[u`);
            } else {
                this.output.write(`\x1B[s${moveRight}\x1B[K\x1B[u`);
            }
        } else {
            this.output.write(`\x1B[s${moveRight}\x1B[K\x1B[u`);
        }
    };

    // ── Override _ttyWrite to intercept keys in selection mode ──
    const originalTtyWrite = rl._ttyWrite;
    rl._ttyWrite = function (s, key) {
        if (inSelectionMode) {
            if (key && key.name === 'right') {
                // Navigate selection right
                if (selectedIndex < currentHits.length - 1) {
                    selectedIndex++;
                }
                rl._refreshLine();
                return;
            }

            if (key && key.name === 'left') {
                // Navigate selection left
                if (selectedIndex > 0) {
                    selectedIndex--;
                }
                rl._refreshLine();
                return;
            }

            if (key && key.name === 'up') {
                // Exit selection mode, restore saved input
                inSelectionMode = false;
                rl.line = savedInput;
                rl.cursor = savedInput.length;
                rl._refreshLine();
                return;
            }

            if (key && key.name === 'return') {
                // Write selected command into input (don't submit)
                inSelectionMode = false;
                const selected = currentHits[selectedIndex] || '';
                rl.line = selected;
                rl.cursor = selected.length;
                rl._refreshLine();
                return;
            }

            // Any other key: exit selection mode and pass through normally
            inSelectionMode = false;
            originalTtyWrite.call(this, s, key);
            return;
        }

        // ── Normal mode ──
        if (key && key.name === 'down' && !octopusState) {
            const text = (rl.line || '').trim();
            const hits = commandsList.filter(c => c.startsWith(text));
            if (hits.length > 0 && text.length > 0) {
                // Enter selection mode
                inSelectionMode = true;
                savedInput = rl.line;
                currentHits = hits;
                selectedIndex = 0;
                suggestionOffset = 0;
                rl._refreshLine();
                return;
            }
        }

        if (key && key.name === 'return') {
            rl._hideGhostText = true;
            rl._refreshLine();
            rl._hideGhostText = false;
        }

        originalTtyWrite.call(this, s, key);
    };

    // Eagerly refresh suggestions on every keypress for smooth updates
    process.stdin.on('keypress', (str, key) => {
        if (isExecuting) return; // Prevent prompt repainting while agents are streaming
        if (!inSelectionMode) {
            setTimeout(() => {
                rl._refreshLine();
            }, 0);
        }
    });

    rl.prompt();

    rl.on('line', async (line) => {
        isExecuting = true;
        // Cleanly wipe the ghost suggestion text that was left on the previous line
        process.stdout.write('\x1B[1A\x1B[2K\x1B[0G' + rl._prompt + line + '\n');

        const input = line.trim();

        if (!input) {
            isExecuting = false;
            rl.prompt();
            return;
        }

        // ── Octopus mode: intercept all input ──
        if (octopusState) {
            // /exit — leave octopus mode
            if (input.toLowerCase() === '/exit') {
                console.log(colors.muted(`\n  ${icons.check} Leaving Octopus Mode\n`));
                octopusState = null;
                rl.setPrompt(getPrompt());
                isExecuting = false;
                rl.prompt();
                return;
            }

            // Send everything else as a prompt to the active agent
            const { agent, colorFn } = octopusState;
            console.log('');

            try {
                await agent.send(input);
                console.log('\n');
            } catch (err) {
                console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}\n`));
            }
            isExecuting = false;
            rl.prompt();
            return;
        }

        const [command, ...args] = input.split(/\s+/);
        const cmd = command.toLowerCase();

        try {
            switch (cmd) {
                // ── AI Agents ──
                case 'claude':
                    await handleClaude(args, rl);
                    break;

                case 'gemini':
                    await handleGemini(args, rl);
                    break;

                case 'ollama':
                    await handleOllama(args, rl);
                    break;

                case 'groq':
                    await handleGroq(args, rl);
                    break;

                case 'octopus':
                    await handleOctopus(args, rl);
                    break;

                // ── WhatsApp ──
                case 'wa':
                case 'whatsapp':
                    await handleWhatsApp(args);
                    break;

                // ── Slack ──
                case 'slack':
                    await handleSlack(args);
                    break;

                // ── Telegram ──
                case 'tg':
                case 'telegram':
                    await handleTelegram(args);
                    break;

                // ── System ──
                case 'cd': {
                    changeDirectory(args.join(' '), rl);
                    console.log('');
                    break;
                }

                case 'theme':
                    await handleTheme(args, rl);
                    break;

                case 'ngrok':
                    await handleNgrok(args);
                    break;

                case 'folder':
                    await handleFolder();
                    break;

                case 'config':
                    await handleConfig(args);
                    break;

                case 'status':
                    await handleStatus();
                    break;

                case 'help':
                case '?':
                    showHelp();
                    break;

                case 'clear':
                case 'cls':
                    console.clear();
                    showBanner(pkg.version);
                    console.log(colors.muted(`  ${icons.star} Hello! What can I do for you today?`));
                    break;

                case 'exit':
                case 'quit':
                case 'q':
                    rl.close();
                    return;

                default:
                    if (input.startsWith('!')) {
                        const shellCmd = input.slice(1).trim();
                        if (shellCmd.startsWith('cd ') || shellCmd === 'cd') {
                            const target = shellCmd.slice(2).trim();
                            changeDirectory(target, rl);
                            console.log('');
                        } else {
                            await handleShellCommand(shellCmd);
                        }
                    } else {
                        console.log(colors.warning(`  Unknown command: ${colors.text(cmd)}`));
                        console.log(colors.muted(`  Type ${colors.accent('help')} to see available commands`));
                        console.log('');
                    }
                    break;
            }
        } catch (err) {
            console.log(colors.error(`  ${icons.cross} Error: ${err.message}\n`));
        }

        isExecuting = false;
        rl.prompt();
    });

    rl.on('close', () => {
        stopNgrok();
        console.log(colors.muted(`\n  ${icons.star} Goodbye!\n`));
        process.exit(0);
    });

    // Graceful shutdown
    const cleanup = () => {
        stopNgrok();
        slackDisconnect();
        tgDisconnect().catch(() => { });
        waDisconnect().catch(() => { });
    };

    process.on('SIGINT', () => {
        console.log(colors.muted(`\n  ${icons.star} Goodbye!\n`));
        cleanup();
        setTimeout(() => process.exit(0), 500);
    });

    process.on('SIGTERM', () => {
        cleanup();
        setTimeout(() => process.exit(0), 500);
    });
}

main().catch((err) => {
    stopNgrok();
    console.error(colors.error(`Fatal error: ${err.message}`));
    process.exit(1);
});
