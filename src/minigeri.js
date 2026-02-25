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
import { loadConfig, getAgent, saveConfig } from './config.js';
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

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// Initialize theme
const currentConfig = loadConfig();
if (currentConfig.theme) {
    setTheme(currentConfig.theme);
}

// ─── Command Handlers ─────────────────────────────────────────────

async function handleClaude(args, rl) {
    const prompt = args.join(' ').trim();
    const agentConfig = getAgent('claude-code');
    const agent = createAgent('claude-code', agentConfig);

    const available = await agent.isAvailable();
    if (!available) {
        console.log(colors.error(`  ${icons.cross} Claude Code is not installed or not in PATH`));
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
    const prompt = args.join(' ').trim();
    const agentConfig = getAgent('gemini-cli');
    const agent = createAgent('gemini-cli', agentConfig);

    const available = await agent.isAvailable();
    if (!available) {
        console.log(colors.error(`  ${icons.cross} Gemini CLI is not installed or not in PATH`));
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
    console.log(colors.muted('───────────────────────────────────────────────\n'));
    try {
        await agent.send(prompt);
        console.log(colors.muted('\n───────────────────────────────────────────────'));
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

        // Show info about the current or a specific model
        case 'model':
        case 'show':
        case 'info': {
            const modelName = args[1] || agentConfig.model;
            console.log(`\n  ${colors.ollama.bold('Model Info')} ${colors.muted('—')} ${colors.ollama(modelName)}`);
            console.log(colors.muted('  ─────────────────────────────────────────────'));
            try {
                const info = await agent.showModel(modelName);
                const lines = info.split('\n');
                for (const line of lines) {
                    console.log(`  ${colors.text(line)}`);
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
            rl.setPrompt(colors.primary('  minigeri ▸ '));
        }
    } else {
        console.log(`\n  ${colors.warning('Usage:')} ${colors.primary('theme list')} or ${colors.primary('theme <theme_id>')}`);
        console.log(`  ${colors.muted('Example:')} theme ocean\n`);
    }
}

// ─── Status & Shell ───────────────────────────────────────────────

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
        if (name === 'claude-code') color = colors.claude;
        else if (name === 'gemini-cli') color = colors.gemini;
        else if (name === 'ollama') color = colors.ollama;
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
        'claude', 'gemini',
        'ollama', 'ollama models', 'ollama model', 'ollama use', 'ollama pull', 'ollama rm', 'ollama ps',
        'ollama clear', 'ollama history',
        'wa connect', 'wa send', 'wa status', 'wa disconnect',
        'slack connect', 'slack send', 'slack read', 'slack channels', 'slack status', 'slack disconnect',
        'tg connect', 'tg send', 'tg chats', 'tg status', 'tg disconnect',
        'ngrok', 'ngrok stop', 'ngrok status',
        'status', 'help', 'clear', 'exit', 'quit', 'folder', 'cd', 'theme <theme-id>', 'theme list',
    ].sort();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colors.primary('  minigeri ▸ '),
        completer: (line) => {
            const hits = commandsList.filter((c) => c.startsWith(line.trim()));
            return [hits.length ? hits : commandsList, line];
        },
    });

    const originalRefresh = rl._refreshLine;
    rl._refreshLine = function () {
        originalRefresh.call(this);

        const text = this.line || '';
        const dist = text.length - this.cursor;
        const moveRight = dist > 0 ? `\x1B[${dist}C` : '';

        if (text.trim().length > 0 && !this._hideGhostText) {
            const hits = commandsList.filter(c => c.startsWith(text.trim()));
            if (hits.length > 0) {
                const suggestionString = '   \x1b[90m[' + hits.join(' \x1b[37m·\x1b[90m ') + ']\x1b[0m';
                this.output.write(`\x1B[s${moveRight}${suggestionString}\x1B[K\x1B[u`);
            } else {
                this.output.write(`\x1B[s${moveRight}\x1B[K\x1B[u`);
            }
        } else {
            this.output.write(`\x1B[s${moveRight}\x1B[K\x1B[u`);
        }
    };

    // NodeJS readline optimizes purely appended text by not redrawing the whole prompt.
    // We explicitly tap into the input stream's keypress to ensure our suggestions 
    // update eagerly for every added character. 
    process.stdin.on('keypress', (str, key) => {
        if (key && key.name === 'return') {
            rl._hideGhostText = true;
            rl._refreshLine();
            rl._hideGhostText = false;
            return;
        }
        setTimeout(() => {
            rl._refreshLine();
        }, 0);
    });

    rl.prompt();

    rl.on('line', async (line) => {
        // Cleanly wipe the ghost suggestion text that was left on the previous line
        process.stdout.write('\x1B[1A\x1B[2K\x1B[0G' + rl._prompt + line + '\n');

        const input = line.trim();

        if (!input) {
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
                    const dir = args.join(' ') || process.env.HOME || '/';
                    try {
                        process.chdir(dir);
                    } catch (err) {
                        console.log(colors.error(`  ${icons.cross} Error changing directory: ${err.message}`));
                    }
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
                        await handleShellCommand(input.slice(1).trim());
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
