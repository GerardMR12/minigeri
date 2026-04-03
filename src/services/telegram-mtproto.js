import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { loadConfig, saveConfig } from '../config.js';
import { colors, icons } from '../ui/theme.js';

/**
 * Prompt the user for input via readline.
 * Creates a fresh interface per question to avoid conflicts with the main REPL.
 */
function prompt(question) {
    return new Promise((res) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            res(answer.trim());
        });
    });
}

function getCredentials() {
    const config = loadConfig();
    return {
        apiId: parseInt(process.env.TELEGRAM_API_ID || config.telegramApiId || '0', 10),
        apiHash: process.env.TELEGRAM_API_HASH || config.telegramApiHash || '',
        sessionStr: process.env.TELEGRAM_USER_SESSION || config.telegramUserSession || '',
    };
}

/**
 * Interactive setup — authenticates as your personal Telegram account
 * and saves the session string to config. Run once.
 */
export async function tgUserSetup() {
    const { apiId, apiHash } = getCredentials();

    if (!apiId || !apiHash) {
        console.log(colors.error(`\n  ${icons.cross} TELEGRAM_API_ID and TELEGRAM_API_HASH are required.\n`));
        console.log(colors.text('  How to get them:'));
        console.log(colors.muted('  1. Open https://my.telegram.org in your browser'));
        console.log(colors.muted('  2. Sign in with your phone number (Telegram sends you an OTP)'));
        console.log(colors.muted('  3. Click "API development tools"'));
        console.log(colors.muted('  4. Fill in App title and Short name (anything works)'));
        console.log(colors.muted('  5. Click "Create application"'));
        console.log(colors.muted('  6. Copy "App api_id" (number) and "App api_hash" (hex string)\n'));
        console.log(colors.muted('  Then run:'));
        console.log(`  ${colors.primary('config set TELEGRAM_API_ID <your_api_id>')}`);
        console.log(`  ${colors.primary('config set TELEGRAM_API_HASH <your_api_hash>')}\n`);
        return;
    }

    console.log(colors.telegram(`\n  Setting up Telegram MTProto user session...`));
    console.log(colors.muted('  This authenticates as your personal Telegram account.'));
    console.log(colors.muted('  Files sent via this session go ONLY to your Saved Messages.\n'));

    const session = new StringSession('');
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    try {
        await client.start({
            phoneNumber: () => prompt(colors.telegram('  Enter your phone number (e.g. +1234567890): ')),
            phoneCode: () => prompt(colors.telegram('  Enter the OTP code you received on Telegram: ')),
            password: () => prompt(colors.telegram('  Enter your 2FA password (or press Enter to skip): ')),
            onError: (err) => {
                console.log(colors.error(`  ${icons.cross} Auth error: ${err.message}`));
            },
        });

        const sessionString = client.session.save();

        const config = loadConfig();
        config.telegramUserSession = sessionString;
        saveConfig(config);
        process.env.TELEGRAM_USER_SESSION = sessionString;

        console.log(colors.telegram(`\n  ${icons.check} Session created and saved to config!`));
        console.log(colors.muted('  You can now use: tg user sendfile <path>\n'));

        await client.disconnect();
    } catch (err) {
        console.log(colors.error(`\n  ${icons.cross} Setup failed: ${err.message}\n`));
        try { await client.disconnect(); } catch { /* ignore */ }
    }
}

/**
 * Send a local file to your own Saved Messages via MTProto.
 * The destination is always hardcoded to "me" — it cannot be changed.
 *
 * @param {string} filePath - Absolute or relative path to the file
 */
export async function tgUserSendFile(filePath) {
    const { apiId, apiHash, sessionStr } = getCredentials();

    if (!apiId || !apiHash) {
        console.log(colors.error(`  ${icons.cross} TELEGRAM_API_ID / TELEGRAM_API_HASH not configured.`));
        console.log(colors.muted('  Run: tg user setup\n'));
        return;
    }

    if (!sessionStr) {
        console.log(colors.error(`  ${icons.cross} No MTProto session found.`));
        console.log(colors.muted('  Run: tg user setup\n'));
        return;
    }

    const resolved = resolve(process.cwd(), filePath);

    if (!existsSync(resolved)) {
        console.log(colors.error(`  ${icons.cross} File not found: ${resolved}\n`));
        return;
    }

    const sizeMB = (statSync(resolved).size / 1024 / 1024).toFixed(1);
    console.log(colors.telegram(`\n  Sending file to your Saved Messages...`));
    console.log(colors.muted(`  File : ${resolved}`));
    console.log(colors.muted(`  Size : ${sizeMB} MB\n`));

    const session = new StringSession(sessionStr);
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
        shouldReconnect: false,
    });

    suppressGramJsTimeouts();

    try {
        await client.connect();

        // Always send to self — "me" resolves to Saved Messages, never to anyone else
        const me = await client.getMe();
        await client.sendFile(me, {
            file: resolved,
            caption: `Sent from minigeri — ${new Date().toLocaleString()}`,
            progressCallback: (progress) => {
                const pct = Math.round(progress * 100);
                process.stdout.write(`\r  Uploading... ${pct}%   `);
            },
        });

        process.stdout.write('\r');
        console.log(colors.telegram(`  ${icons.check} File sent to your Saved Messages!\n`));

        await client.disconnect();
    } catch (err) {
        process.stdout.write('\r');
        console.log(colors.error(`\n  ${icons.cross} Failed to send file: ${err.message}\n`));
        if (err.message.includes('SESSION_REVOKED') || err.message.includes('AUTH_KEY')) {
            console.log(colors.muted('  Session expired. Run: tg user setup\n'));
        }
        try { await client.disconnect(); } catch { /* ignore */ }
    }
}

/**
 * Returns true if MTProto credentials (api_id, api_hash, session) are all configured.
 * Used by the bot handler to decide whether to attempt MTProto before falling back to ngrok.
 */
export function tgMtprotoAvailable() {
    const { apiId, apiHash, sessionStr } = getCredentials();
    return !!(apiId && apiHash && sessionStr);
}

/**
 * GramJS's internal update loop emits TIMEOUT unhandled rejections after disconnect().
 * This helper suppresses them for a short window while the loop settles.
 * Only rejections whose stack traces originate from GramJS's updates.js are swallowed;
 * everything else falls through to any other registered handlers (or Node's default).
 */
let _gramJsSuppressionActive = false;

function suppressGramJsTimeouts() {
    if (_gramJsSuppressionActive) return;
    _gramJsSuppressionActive = true;

    process.on('unhandledRejection', (reason) => {
        if (reason?.message === 'TIMEOUT' && reason?.stack?.includes('updates.js')) return;
        // Not our error — re-throw so Node's default handler picks it up
        throw reason;
    });
}

/**
 * Send an already-resolved local file path to Saved Messages via MTProto.
 * Designed to be called programmatically (e.g. from the bot handler).
 *
 * @param {string} resolvedPath - Absolute path, already validated to exist
 * @param {(pct: number) => void} [onProgress] - Optional progress callback (0–100)
 * @returns {Promise<void>} Resolves on success, rejects on failure
 */
export async function tgSendLargeFileToSelf(resolvedPath, onProgress) {
    const { apiId, apiHash, sessionStr } = getCredentials();

    const session = new StringSession(sessionStr);
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
        shouldReconnect: false,
    });

    suppressGramJsTimeouts();
    await client.connect();

    try {
        const me = await client.getMe();
        await client.sendFile(me, {
            file: resolvedPath,
            caption: `Sent from minigeri — ${new Date().toLocaleString()}`,
            progressCallback: onProgress
                ? (progress) => onProgress(Math.round(progress * 100))
                : undefined,
        });
    } finally {
        try { await client.disconnect(); } catch { /* ignore */ }
    }
}

/**
 * Show the current MTProto configuration status.
 */
export function tgUserStatus() {
    const { apiId, apiHash, sessionStr } = getCredentials();

    console.log(colors.telegram(`\n  Telegram MTProto (User Account)`));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  TELEGRAM_API_ID    ${apiId ? colors.success(`${icons.check} set`) : colors.muted(`${icons.cross} not set`)}`);
    console.log(`  TELEGRAM_API_HASH  ${apiHash ? colors.success(`${icons.check} set`) : colors.muted(`${icons.cross} not set`)}`);
    console.log(`  Session            ${sessionStr ? colors.success(`${icons.check} set`) : colors.muted(`${icons.cross} not set — run tg user setup`)}`);
    console.log('');
}
