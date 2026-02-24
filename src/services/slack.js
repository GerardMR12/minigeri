import { WebClient } from '@slack/web-api';
import { colors, icons } from '../ui/theme.js';

let client = null;
let isConnected = false;
let botInfo = null;

/**
 * Connect to Slack using a Bot Token from the environment.
 */
export async function slackConnect() {
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
        console.log(colors.error(`  ${icons.cross} SLACK_BOT_TOKEN not set in .env`));
        console.log(colors.muted('  1. Create a Slack App at https://api.slack.com/apps'));
        console.log(colors.muted('  2. Add Bot Token Scopes (chat:write, channels:read, channels:history, users:read)'));
        console.log(colors.muted('  3. Install to workspace and copy the Bot User OAuth Token'));
        console.log(colors.muted('  4. Add SLACK_BOT_TOKEN=xoxb-... to your .env file'));
        return;
    }

    try {
        client = new WebClient(token);

        // Test the connection
        const authResult = await client.auth.test();
        botInfo = authResult;
        isConnected = true;

        console.log(colors.slack(`  ${icons.check} Slack connected!`));
        console.log(colors.muted(`    Bot: ${authResult.user} (${authResult.team})`));
    } catch (err) {
        isConnected = false;
        console.log(colors.error(`  ${icons.cross} Slack connection failed: ${err.message}`));
    }
}

/**
 * Auto-connect if token is available (called on startup).
 */
export async function slackAutoConnect() {
    if (process.env.SLACK_BOT_TOKEN && !isConnected) {
        try {
            client = new WebClient(process.env.SLACK_BOT_TOKEN);
            const authResult = await client.auth.test();
            botInfo = authResult;
            isConnected = true;
        } catch {
            // Silent fail on auto-connect
        }
    }
}

/**
 * Send a message to a Slack channel.
 * @param {string} channel - Channel name (without #) or channel ID
 * @param {string} message - Message text
 */
export async function slackSend(channel, message) {
    if (!isConnected) {
        console.log(colors.error(`  ${icons.cross} Slack is not connected. Run ${colors.slack('slack connect')} first.`));
        return;
    }

    try {
        // If channel is a name (not ID), try to resolve it
        let channelId = channel;
        if (!channel.startsWith('C') && !channel.startsWith('D') && !channel.startsWith('G')) {
            channelId = await resolveChannel(channel.replace(/^#/, ''));
            if (!channelId) {
                console.log(colors.error(`  ${icons.cross} Channel "${channel}" not found`));
                return;
            }
        }

        await client.chat.postMessage({
            channel: channelId,
            text: message,
        });
        console.log(colors.slack(`  ${icons.check} Message sent to #${channel}`));
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Failed to send: ${err.message}`));
    }
}

/**
 * List available Slack channels.
 */
export async function slackChannels() {
    if (!isConnected) {
        console.log(colors.error(`  ${icons.cross} Slack is not connected. Run ${colors.slack('slack connect')} first.`));
        return;
    }

    try {
        const result = await client.conversations.list({
            types: 'public_channel,private_channel',
            limit: 50,
        });

        console.log(colors.slack.bold('\n  Slack Channels'));
        console.log(colors.muted('  ─────────────────────────────────────────────'));

        for (const ch of result.channels) {
            const memberTag = ch.is_member ? colors.success(' (joined)') : '';
            const prefix = ch.is_private ? '🔒' : '#';
            console.log(`  ${colors.muted(prefix)} ${colors.text(ch.name)}${memberTag}`);
        }
        console.log('');
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Failed to list channels: ${err.message}`));
    }
}

/**
 * Read recent messages from a Slack channel.
 * @param {string} channel - Channel name or ID
 * @param {number} count - Number of messages to fetch
 */
export async function slackRead(channel, count = 10) {
    if (!isConnected) {
        console.log(colors.error(`  ${icons.cross} Slack is not connected. Run ${colors.slack('slack connect')} first.`));
        return;
    }

    try {
        let channelId = channel;
        if (!channel.startsWith('C') && !channel.startsWith('D') && !channel.startsWith('G')) {
            channelId = await resolveChannel(channel.replace(/^#/, ''));
            if (!channelId) {
                console.log(colors.error(`  ${icons.cross} Channel "${channel}" not found`));
                return;
            }
        }

        const result = await client.conversations.history({
            channel: channelId,
            limit: count,
        });

        console.log(colors.slack.bold(`\n  Messages in #${channel}`));
        console.log(colors.muted('  ─────────────────────────────────────────────'));

        // Fetch user names for display
        const userCache = {};

        for (const msg of result.messages.reverse()) {
            let username = msg.user || 'bot';
            if (msg.user && !userCache[msg.user]) {
                try {
                    const userInfo = await client.users.info({ user: msg.user });
                    userCache[msg.user] = userInfo.user.real_name || userInfo.user.name;
                } catch {
                    userCache[msg.user] = msg.user;
                }
            }
            username = userCache[msg.user] || username;

            const time = new Date(parseFloat(msg.ts) * 1000).toLocaleTimeString();
            console.log(`  ${colors.muted(time)} ${colors.slack.bold(username)}`);
            console.log(`  ${colors.text(msg.text)}`);
            console.log('');
        }
    } catch (err) {
        console.log(colors.error(`  ${icons.cross} Failed to read messages: ${err.message}`));
    }
}

/**
 * Show Slack connection status.
 */
export function slackStatus() {
    if (isConnected && botInfo) {
        console.log(colors.slack(`  ${icons.bullet} Slack: Connected`));
        console.log(colors.muted(`    Bot: ${botInfo.user} (${botInfo.team})`));
    } else if (process.env.SLACK_BOT_TOKEN) {
        console.log(colors.warning(`  ${icons.circle} Slack: Token set but not connected`));
    } else {
        console.log(colors.error(`  ${icons.circle} Slack: No token configured`));
    }
}

/**
 * Disconnect from Slack.
 */
export function slackDisconnect() {
    if (isConnected) {
        client = null;
        isConnected = false;
        botInfo = null;
        console.log(colors.muted(`  ${icons.check} Slack disconnected`));
    } else {
        console.log(colors.muted('  Not connected'));
    }
}

// ─── Helpers ───────────────────────────────────────────────────────

async function resolveChannel(name) {
    try {
        const result = await client.conversations.list({
            types: 'public_channel,private_channel',
            limit: 200,
        });
        const match = result.channels.find((ch) => ch.name === name);
        return match?.id || null;
    } catch {
        return null;
    }
}
