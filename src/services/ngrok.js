import { spawn } from 'child_process';
import http from 'http';
import { colors, icons } from '../ui/theme.js';

let ngrokProcess = null;

/**
 * Fetch active tunnels from ngrok local API.
 */
export function fetchNgrokTunnels() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:4040/api/tunnels', (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error('Failed to parse ngrok API response'));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

/**
 * Start or stop ngrok tunnel, or show status.
 * @param {string[]} args - Command arguments
 * @returns {Promise<string|void>} Status message if called remotely
 */
export async function handleNgrok(args, isRemote = false) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'stop') {
        if (ngrokProcess) {
            ngrokProcess.kill();
            ngrokProcess = null;
            const msg = `✅ ngrok tunnel stopped`;
            if (isRemote) return msg;
            console.log(`
  ${colors.success(icons.check)} ${msg}
`);
        } else {
            const msg = `⚠️ No ngrok tunnel is running`;
            if (isRemote) return msg;
            console.log(`
  ${colors.warning(icons.warning)} ${msg}
`);
        }
        return;
    }

    if (subcommand === 'status') {
        if (!ngrokProcess) {
            const msg = `❌ ngrok is not running`;
            if (isRemote) return msg;
            console.log(`
  ${colors.error(icons.circle)} ${msg}
`);
            return;
        }
        try {
            const data = await fetchNgrokTunnels();
            let output = `🟢 ngrok is running
`;
            if (!isRemote) {
                console.log(`
  ${colors.success(icons.bullet)} ngrok is ${colors.success('running')}`);
                console.log(colors.muted('  ─────────────────────────────────────────────'));
            }
            for (const tunnel of data.tunnels || []) {
                if (isRemote) {
                    output += `
*Name:* ${tunnel.name}
*Public URL:* ${tunnel.public_url}
*Forwards to:* ${tunnel.config?.addr || 'N/A'}
`;
                } else {
                    console.log(`  ${colors.accent('Name')}         ${colors.text(tunnel.name)}`);
                    console.log(`  ${colors.accent('Public URL')}   ${colors.secondary.bold(tunnel.public_url)}`);
                    console.log(`  ${colors.accent('Forwards to')} ${colors.text(tunnel.config?.addr || 'N/A')}`);
                    console.log(`  ${colors.accent('Protocol')}     ${colors.text(tunnel.proto)}`);
                    console.log('');
                }
            }
            if (isRemote) return output.trim();
        } catch {
            const msg = `❌ Could not reach ngrok API`;
            if (isRemote) return msg;
            console.log(`
  ${colors.error(icons.cross)} ${msg}
`);
        }
        return;
    }

    // Default: start ngrok
    if (ngrokProcess) {
        const msg = `⚠️ ngrok is already running. Use 'ngrok stop' first.`;
        if (isRemote) return msg;
        console.log(`
  ${colors.warning(icons.warning)} ${msg}
`);
        return;
    }

    const port = args[0] || '8080';
    if (!isRemote) {
        console.log(`
  ${colors.secondary(icons.rocket)} Starting ngrok tunnel on port ${colors.accent(port)}...
`);
    }

    ngrokProcess = spawn('ngrok', ['http', port, '--log=stdout', '--log-format=json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
    });

    ngrokProcess.on('error', (err) => {
        const msg = `❌ Failed to start ngrok: ${err.message}`;
        if (isRemote) return; // Can't easily return from event handler
        console.log(colors.error(`  ${icons.cross} ${msg}`));
        console.log(colors.muted('  Make sure ngrok is installed and in your PATH'));
        ngrokProcess = null;
    });

    ngrokProcess.on('exit', () => {
        ngrokProcess = null;
    });

    // Wait for ngrok to initialize then query its API
    let tunnelInfo = null;
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
            tunnelInfo = await fetchNgrokTunnels();
            if (tunnelInfo.tunnels && tunnelInfo.tunnels.length > 0) break;
        } catch {
            // ngrok not ready yet
        }
    }

    if (!tunnelInfo || !tunnelInfo.tunnels || tunnelInfo.tunnels.length === 0) {
        const msg = `❌ Could not retrieve tunnel info. ngrok may have failed to start.`;
        if (ngrokProcess) { ngrokProcess.kill(); ngrokProcess = null; }
        if (isRemote) return msg;
        console.log(colors.error(`

  ${icons.cross} ${msg}`));
        console.log('');
        return;
    }

    let output = `🚀 ngrok tunnel is live!
`;
    if (!isRemote) {
        console.log(colors.success(`

  ${icons.check} ngrok tunnel is live!`));
        console.log(colors.muted('  ─────────────────────────────────────────────'));
    }
    for (const tunnel of tunnelInfo.tunnels) {
        if (isRemote) {
            output += `
*Public URL:* ${tunnel.public_url}
*Forwards to:* ${tunnel.config?.addr || 'N/A'}`;
        } else {
            console.log(`  ${colors.accent('Name')}         ${colors.text(tunnel.name)}`);
            console.log(`  ${colors.accent('Public URL')}   ${colors.secondary.bold(tunnel.public_url)}`);
            console.log(`  ${colors.accent('Forwards to')} ${colors.text(tunnel.config?.addr || 'N/A')}`);
            console.log(`  ${colors.accent('Protocol')}     ${colors.text(tunnel.proto)}`);
            console.log('');
        }
    }
    if (isRemote) return output.trim();
}

/**
 * Kill ngrok process if it's running.
 */
export function stopNgrok() {
    if (ngrokProcess) {
        ngrokProcess.kill();
        ngrokProcess = null;
    }
}

/**
 * Check if ngrok is running.
 */
export function isNgrokRunning() {
    return ngrokProcess !== null;
}
