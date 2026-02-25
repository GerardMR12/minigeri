import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { colors, icons } from '../ui/theme.js';
import { join } from 'path';
import { homedir } from 'os';
import { createAgent } from '../agents/index.js';
import { getAgent, loadConfig } from '../config.js';
import { getHelpText } from '../ui/help.js';
import { handleSafeCommand } from '../utils/cmd.js';
import { formatTelegramMarkdown, splitTelegramMessage } from '../utils/telegram-format.js';
import { handleNgrok } from './ngrok.js';

let client = null;
let isReady = false;
let isConnecting = false;
let ollamaAgents = new Map(); // chatId → OllamaAgent (persistent for context)
let groqAgents = new Map(); // chatId → GroqAgent (persistent for context)

const AUTH_PATH = join(homedir(), '.cli-bot', 'whatsapp-auth');

/**
 * Get the WhatsApp client, creating it if needed.
 */
function getClient() {
    if (!client) {
        client = new Client({
            authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        client.on('authenticated', () => {
            console.log(colors.whatsapp(`\n  ${icons.check} WhatsApp authenticated`));
        });

        client.on('auth_failure', (msg) => {
            console.log(colors.error(`\n  ${icons.cross} WhatsApp auth failed: ${msg}`));
            isConnecting = false;
        });

        client.on('ready', () => {
            isReady = true;
            isConnecting = false;
            console.log(colors.whatsapp(`\n  ${icons.check} WhatsApp is ready!`));
            console.log(colors.muted('  You can now send messages with: wa send <number> <message>'));
            console.log('');
            // Re-show prompt
            process.stdout.write(colors.primary('  minigeri ▸ '));
        });

        client.on('message', (msg) => handleIncomingMessage(msg));

        client.on('disconnected', (reason) => {
            console.log(colors.warning(`\n  ${icons.warning} WhatsApp disconnected: ${reason}`));
            isReady = false;
            isConnecting = false;
        });
    }
    return client;
}

/**
 * Connect to WhatsApp — shows QR code in terminal.
 */
export async function waConnect() {
    if (isReady) {
        console.log(colors.whatsapp(`  ${icons.check} WhatsApp is already connected!`));
        return;
    }

    if (isConnecting) {
        console.log(colors.warning(`  ${icons.warning} Already connecting... waiting for QR scan`));
        return;
    }

    isConnecting = true;
    const wa = getClient();

    console.log(colors.whatsapp(`  ${icons.phone} Starting WhatsApp connection...`));
    console.log(colors.muted('  Scan the QR code below with your phone:\n'));

    wa.on('qr', (qr) => {
        qrcode.generate(qr, { small: true }, (qrString) => {
            // Indent QR code
            const indented = qrString.split('\n').map(line => '    ' + line).join('\n');
            console.log(indented);
            console.log(colors.muted('\n  Waiting for scan...'));
        });
    });

    try {
        await wa.initialize();
    } catch (err) {
        isConnecting = false;
        console.log(colors.error(`  ${icons.cross} Failed to connect: ${err.message}`));
    }
}

/**
 * Send a WhatsApp message.
 * @param {string} to - Phone number with country code (e.g., "34612345678")
 * @param {string} message - Message text
 */
export async function waSend(to, message) {
    if (!isReady) {
        console.log(colors.error(`  ${icons.cross} WhatsApp is not connected. Run ${colors.whatsapp('wa connect')} first.`));
        return;
    }

    // Ensure the number is in the right format (number@c.us)
    const chatId = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@c.us`;

    try {
        console.log(colors.muted(`  Sending to ${to}...`));
        await client.sendMessage(chatId, message);
        console.log(colors.whatsapp(`  ${icons.check} Message sent to ${to}`));
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Failed to send: ${err.message}`));
    }
}

/**
 * Get WhatsApp connection status.
 */
export function waStatus() {
    if (isReady) {
        const info = client.info;
        console.log(colors.whatsapp(`  ${icons.bullet} WhatsApp: Connected`));
        if (info) {
            console.log(colors.muted(`    Phone: ${info.wid?.user || 'unknown'}`));
            console.log(colors.muted(`    Platform: ${info.platform || 'unknown'}`));
        }
    } else if (isConnecting) {
        console.log(colors.warning(`  ${icons.circle} WhatsApp: Connecting...`));
    } else {
        console.log(colors.error(`  ${icons.circle} WhatsApp: Disconnected`));
    }
}

/**
 * Disconnect WhatsApp.
 */
export async function waDisconnect() {
    if (client && isReady) {
        await client.destroy();
        isReady = false;
        isConnecting = false;
        client = null;
        console.log(colors.muted(`  ${icons.check} WhatsApp disconnected`));
    } else {
        console.log(colors.muted(`  Not connected`));
    }
}

/**
 * Handle incoming WhatsApp messages and route bot commands.
 */
async function handleIncomingMessage(msg) {
    const from = msg.from;
    const body = msg.body || '';
    const contact = await msg.getContact();
    const sender = contact.pushname || contact.name || from;

    console.log('');
    console.log(colors.whatsapp(`  📩 WhatsApp Message`));
    console.log(colors.muted(`     From: ${sender} (${from})`));
    console.log(colors.text(`     ${body || '[non-text message]'}`));

    const textStr = body.trim();
    const lowText = textStr.toLowerCase();

    if (lowText === 'help' || lowText === '/help') {
        await msg.reply(getHelpText());
        console.log(colors.whatsapp(`  ${icons.check} Sent help message to WhatsApp user`));
    } else if (lowText === '/folder') {
        await msg.reply(`📁 *Current Directory:*\n\`${process.cwd()}\``);
        console.log(colors.whatsapp(`  ${icons.check} Sent folder path to WhatsApp user`));
    } else if (lowText === '/ngrok') {
        console.log(colors.whatsapp(`  [Starting ngrok via WhatsApp: 8080]`));
        const response = await handleNgrok(['8080'], true);
        await msg.reply(response);
    } else if (textStr.startsWith('/cmd ') || textStr === '/cmd') {
        const cmdStr = textStr.substring(5).trim();
        if (!cmdStr) {
            await msg.reply(`Please provide a command. Example: /cmd ls -la`);
        } else {
            console.log(colors.whatsapp(`  [Running secure command via WhatsApp: ${cmdStr}]`));
            const response = await handleSafeCommand(cmdStr);
            await msg.reply(response);
        }
    } else {
        let agentName = null;
        let prompt = '';
        const botConfig = loadConfig();

        if (textStr.startsWith('/gemini ') || textStr === '/gemini') {
            agentName = botConfig.geminiMode === 'api' ? 'gemini-api' : 'gemini-cli';
            prompt = textStr.substring(7).trim();
        } else if (textStr.startsWith('/claude ') || textStr === '/claude') {
            agentName = botConfig.claudeMode === 'api' ? 'claude-api' : 'claude-code';
            prompt = textStr.substring(7).trim();
        } else if (textStr.startsWith('/ollama ') || textStr === '/ollama') {
            agentName = 'ollama';
            prompt = textStr.substring(7).trim();
        } else if (textStr.startsWith('/groq ') || textStr === '/groq') {
            agentName = 'groq';
            prompt = textStr.substring(5).trim();
        }

        if (agentName) {
            if (!prompt) {
                const pureName = agentName.replace('-cli', '').replace('-code', '').replace('-api', '');
                await msg.reply(`Please provide a prompt. Example: /${pureName} Hello!`);
            } else {
                console.log(colors.muted(`\n  [Routing WhatsApp message to ${agentName}...]`));
                let botColor;
                if (agentName.startsWith('gemini')) botColor = colors.gemini;
                else if (agentName.startsWith('claude')) botColor = colors.claude;
                else if (agentName === 'groq') botColor = colors.groq;
                else botColor = colors.ollama;

                try {
                    const config = getAgent(agentName);
                    let agent;
                    if (agentName === 'ollama') {
                        // Reuse persistent agent for Ollama to keep conversation context
                        const chatKey = String(from);
                        if (!ollamaAgents.has(chatKey)) {
                            ollamaAgents.set(chatKey, createAgent(agentName, config));
                        }
                        agent = ollamaAgents.get(chatKey);
                    } else if (agentName === 'groq') {
                        const chatKey = String(from);
                        if (!groqAgents.has(chatKey)) {
                            groqAgents.set(chatKey, createAgent(agentName, config));
                        }
                        agent = groqAgents.get(chatKey);
                    } else {
                        agent = createAgent(agentName, config);
                    }

                    const response = await agent.send(prompt, { silent: true });

                    const textToSend = response || '[No response]';
                    const formattedText = formatTelegramMarkdown(textToSend);
                    const chunks = splitTelegramMessage(formattedText);

                    for (const chunk of chunks) {
                        await msg.reply(chunk);
                    }

                    console.log(botColor(`  ${icons.check} Replied to WhatsApp user with ${agentName} response`));
                } catch (err) {
                    await msg.reply(`❌ Error from ${agentName}: ${err.message}`);
                    console.log(colors.error(`  ${icons.cross} Error from agent: ${err.message}`));
                }
            }
        }
    }

    console.log('');
    process.stdout.write(colors.primary('  minigeri ▸ '));
}
