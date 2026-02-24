import TelegramBot from 'node-telegram-bot-api';
import { colors, icons } from '../ui/theme.js';
import { createAgent } from '../agents/index.js';
import { getAgent } from '../config.js';
import { getHelpText } from '../ui/help.js';
import { handleSafeCommand } from '../utils/cmd.js';

let bot = null;
let isConnected = false;
let botInfoCache = null;
let recentChats = new Map(); // chatId → { name, type }

/**
 * Connect the Telegram bot and start polling for messages.
 */
export async function tgConnect() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log(colors.error(`  ${icons.cross} TELEGRAM_BOT_TOKEN not set in .env`));
        console.log(colors.muted('  1. Open Telegram and message @BotFather'));
        console.log(colors.muted('  2. Send /newbot and follow the prompts'));
        console.log(colors.muted('  3. Copy the bot token'));
        console.log(colors.muted('  4. Add TELEGRAM_BOT_TOKEN=<token> to your .env file'));
        return;
    }

    if (isConnected) {
        console.log(colors.telegram(`  ${icons.check} Telegram bot is already connected!`));
        return;
    }

    try {
        bot = new TelegramBot(token, { polling: true });

        // Get bot info
        botInfoCache = await bot.getMe();
        isConnected = true;

        console.log(colors.telegram(`  ${icons.check} Telegram bot connected!`));
        console.log(colors.muted(`    Bot: @${botInfoCache.username} (${botInfoCache.first_name})`));
        console.log(colors.muted(`    Bot ID: ${botInfoCache.id}`));
        console.log(colors.muted(`    Listening for incoming messages...`));

        // Handle incoming messages
        bot.on('message', (msg) => handleIncomingMessage(msg, bot));

        bot.on('polling_error', (err) => {
            // Only log meaningful errors, not cancellations
            if (err.code !== 'ETELEGRAM' || !err.message.includes('terminated')) {
                console.log(colors.error(`\n  ${icons.cross} Telegram polling error: ${err.message}`));
            }
        });

    } catch (err) {
        isConnected = false;
        console.log(colors.error(`  ${icons.cross} Telegram connection failed: ${err.message}`));
    }
}

/**
 * Auto-connect if token is available (called on startup).
 */
export async function tgAutoConnect() {
    if (process.env.TELEGRAM_BOT_TOKEN && !isConnected) {
        try {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            bot = new TelegramBot(token, { polling: true });
            botInfoCache = await bot.getMe();
            isConnected = true;

            // Set up message listener silently
            bot.on('message', (msg) => handleIncomingMessage(msg, bot));

            bot.on('polling_error', () => { }); // Suppress in auto-connect

        } catch {
            // Silent fail on auto-connect
            isConnected = false;
        }
    }
}

/**
 * Send a message to a Telegram chat.
 * @param {string} chatId - Chat ID (number) or @username for public groups/channels
 * @param {string} message - Message text
 */
export async function tgSend(chatId, message) {
    if (!isConnected) {
        console.log(colors.error(`  ${icons.cross} Telegram bot not connected. Run ${colors.telegram('tg connect')} first.`));
        return;
    }

    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        const chatInfo = recentChats.get(chatId.toString());
        const label = chatInfo ? chatInfo.name : chatId;
        console.log(colors.telegram(`  ${icons.check} Message sent to ${label}`));
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Failed to send: ${err.message}`));
        if (err.message.includes('chat not found')) {
            console.log(colors.muted('  The user must message your bot first before you can send to them.'));
            console.log(colors.muted('  For groups, make sure the bot is added to the group.'));
        }
    }
}

/**
 * Show recent chats the bot has interacted with.
 */
export function tgChats() {
    if (!isConnected) {
        console.log(colors.error(`  ${icons.cross} Telegram bot not connected. Run ${colors.telegram('tg connect')} first.`));
        return;
    }

    if (recentChats.size === 0) {
        console.log(colors.muted('  No recent chats yet.'));
        console.log(colors.muted('  Send a message to your bot on Telegram to see chats here.'));
        return;
    }

    console.log(colors.telegram.bold('\n  Recent Telegram Chats'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));

    for (const [id, info] of recentChats) {
        const typeIcon = info.type === 'private' ? '👤' : '👥';
        const ago = Math.round((Date.now() - info.lastMessage) / 1000);
        const timeStr = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;
        console.log(`  ${typeIcon} ${colors.text(info.name)} ${colors.muted(`(${id})`)} ${colors.muted(`— ${timeStr}`)}`);
    }
    console.log('');
}

/**
 * Show Telegram bot status.
 */
export function tgStatus() {
    if (isConnected && botInfoCache) {
        console.log(colors.telegram(`  ${icons.bullet} Telegram: Connected`));
        console.log(colors.muted(`    Bot: @${botInfoCache.username} (${botInfoCache.first_name})`));
        console.log(colors.muted(`    Recent chats: ${recentChats.size}`));
    } else if (process.env.TELEGRAM_BOT_TOKEN) {
        console.log(colors.warning(`  ${icons.circle} Telegram: Token set but not connected`));
    } else {
        console.log(colors.error(`  ${icons.circle} Telegram: No token configured`));
    }
}

/**
 * Disconnect the Telegram bot.
 */
export async function tgDisconnect() {
    if (bot && isConnected) {
        try {
            await bot.stopPolling();
        } catch {
            // Ignore stop errors
        }
        bot = null;
        isConnected = false;
        botInfoCache = null;
        console.log(colors.muted(`  ${icons.check} Telegram bot disconnected`));
    } else {
        console.log(colors.muted('  Not connected'));
    }
}

/**
 * Handle incoming Telegram messages and route bot commands.
 */
async function handleIncomingMessage(msg, botInstance) {
    const chatId = msg.chat.id;
    const chatName = msg.chat.title || msg.chat.first_name || msg.chat.username || String(chatId);
    const sender = msg.from.first_name || msg.from.username || 'Unknown';
    const chatType = msg.chat.type;

    recentChats.set(chatId.toString(), {
        name: chatName,
        type: chatType,
        lastMessage: Date.now(),
    });

    const typeLabel = chatType === 'private' ? 'DM' : `#${chatName}`;
    console.log('');
    console.log(colors.telegram(`  📩 Telegram ${typeLabel}`));
    console.log(colors.muted(`     From: ${sender} (chat: ${chatId})`));
    console.log(colors.text(`     ${msg.text || '[non-text message]'}`));

    // Process bot commands like /gemini or /claude
    if (msg.text) {
        const textStr = msg.text.trim();
        const lowText = textStr.toLowerCase();
        let agentName = null;
        let prompt = '';

        if (lowText === 'help' || lowText === '/help') {
            botInstance.sendMessage(chatId, getHelpText(), { parse_mode: 'Markdown' });
            console.log(colors.telegram(`  ${icons.check} Sent help message to Telegram user`));
        } else if (lowText === '/folder') {
            botInstance.sendMessage(chatId, `📁 *Current Directory:*\n\`${process.cwd()}\``, { parse_mode: 'Markdown' });
            console.log(colors.telegram(`  ${icons.check} Sent folder path to Telegram user`));
        } else if (textStr.startsWith('/cmd ') || textStr === '/cmd') {
            const cmdStr = textStr.substring(5).trim();
            if (!cmdStr) {
                botInstance.sendMessage(chatId, `Please provide a command. Example: /cmd ls -la`);
            } else {
                console.log(colors.telegram(`  [Running secure command via Telegram: ${cmdStr}]`));
                const response = await handleSafeCommand(cmdStr);
                botInstance.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            }
        } else if (textStr.startsWith('/gemini ') || textStr === '/gemini') {
            agentName = 'gemini-cli';
            prompt = textStr.substring(7).trim();
        } else if (textStr.startsWith('/claude ') || textStr === '/claude') {
            agentName = 'claude-code';
            prompt = textStr.substring(7).trim();
        }

        if (agentName) {
            if (!prompt) {
                botInstance.sendMessage(chatId, `Please provide a prompt. Example: /${agentName === 'gemini-cli' ? 'gemini' : 'claude'} Hello!`);
            } else {
                console.log(colors.muted(`\n  [Routing Telegram message to ${agentName}...]`));
                const botColor = agentName === 'gemini-cli' ? colors.gemini : colors.claude;

                try {
                    // Quick reply so the user knows we are processing
                    await botInstance.sendMessage(chatId, `🤖 Thinking...`).catch(() => { });

                    const config = getAgent(agentName);
                    const agent = createAgent(agentName, config);

                    const response = await agent.send(prompt);

                    // Send back
                    await botInstance.sendMessage(chatId, response || '[No response]', { parse_mode: 'Markdown' })
                        .catch(err => {
                            // If Markdown parsing fails (ex. unclosed backticks), fallback to raw text
                            return botInstance.sendMessage(chatId, response || '[No response]');
                        });

                    console.log(botColor(`  ${icons.check} Replied to Telegram user with ${agentName} response`));
                } catch (err) {
                    botInstance.sendMessage(chatId, `❌ Error from ${agentName}: ${err.message}`);
                    console.log(colors.error(`  ${icons.cross} Error from agent: ${err.message}`));
                }
            }
        }
    }

    console.log('');
    process.stdout.write(colors.primary('  minigeri ▸ '));
}
