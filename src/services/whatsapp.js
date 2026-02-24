import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { colors, icons } from '../ui/theme.js';
import { join } from 'path';
import { homedir } from 'os';

let client = null;
let isReady = false;
let isConnecting = false;

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
