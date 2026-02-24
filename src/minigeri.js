#!/usr/bin/env node

import readline from 'readline';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { colors, icons } from './ui/theme.js';
import { showBanner } from './ui/banner.js';
import { showHelp } from './ui/help.js';
import { createAgent, listAgentNames } from './agents/index.js';
import { loadConfig, getAgent } from './config.js';
import { waConnect, waSend, waStatus, waDisconnect } from './services/whatsapp.js';
import {
    slackConnect, slackAutoConnect, slackSend, slackRead,
    slackChannels, slackStatus, slackDisconnect,
} from './services/slack.js';
import {
    tgConnect, tgAutoConnect, tgSend, tgChats,
    tgStatus, tgDisconnect,
} from './services/telegram.js';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

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
    console.log(colors.muted('  ─────────────────────────────────────────────\n'));
    try {
        await agent.send(prompt);
        console.log(colors.muted('\n  ─────────────────────────────────────────────'));
    } catch (err) {
        console.log(colors.error(`\n  ${icons.cross} Error: ${err.message}`));
    }
    console.log('');
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
        const color = name === 'claude-code' ? colors.claude : colors.gemini;
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
    console.clear();
    showBanner(pkg.version);

    // Auto-connect services if tokens are available
    await slackAutoConnect();
    await tgAutoConnect();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colors.primary('  minigeri ▸ '),
        completer: (line) => {
            const commands = [
                'claude', 'gemini',
                'wa connect', 'wa send', 'wa status', 'wa disconnect',
                'slack connect', 'slack send', 'slack read', 'slack channels', 'slack status', 'slack disconnect',
                'tg connect', 'tg send', 'tg chats', 'tg status', 'tg disconnect',
                'status', 'help', 'clear', 'exit', 'quit',
            ];
            const hits = commands.filter((c) => c.startsWith(line.trim()));
            return [hits.length ? hits : commands, line];
        },
    });

    rl.prompt();

    rl.on('line', async (line) => {
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
                    break;

                case 'exit':
                case 'quit':
                case 'q':
                    console.log(colors.muted(`\n  ${icons.star} Goodbye! See you next time.\n`));
                    slackDisconnect();
                    await tgDisconnect().catch(() => { });
                    await waDisconnect().catch(() => { });
                    process.exit(0);

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
        console.log(colors.muted(`\n  ${icons.star} Goodbye!\n`));
        process.exit(0);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(colors.muted(`\n  ${icons.star} Goodbye!\n`));
        slackDisconnect();
        tgDisconnect().catch(() => { });
        waDisconnect().catch(() => { }).finally(() => process.exit(0));
    });
}

main().catch((err) => {
    console.error(colors.error(`Fatal error: ${err.message}`));
    process.exit(1);
});
