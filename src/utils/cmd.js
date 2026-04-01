import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

const ALLOWED_COMMANDS = ['cd', 'mkdir', 'ls', 'flutter'];

/**
 * Handle safe remote commands
 * @param {string} cmdStr - Command to run
 * @returns {Promise<string>} Output or error message
 */
export async function handleSafeCommand(cmdStr) {
    const parts = cmdStr.trim().match(/[^\s"]+|"[^"]+"/g) || [];

    if (parts.length === 0) {
        return '❌ Error: No command provided.';
    }

    const command = parts[0];
    const args = parts.slice(1).map(p => p.replace(/^"|"$/g, ''));

    if (!ALLOWED_COMMANDS.includes(command)) {
        return `❌ Error: Only ${ALLOWED_COMMANDS.map(c => `'${c}'`).join(', ')} are allowed for safety.`;
    }

    if (command === 'cd') {
        try {
            const dir = args.length > 0 ? args[0] : (process.env.HOME || '/');
            process.chdir(dir);
            return `📁 Changed directory to: \`${process.cwd()}\``;
        } catch (err) {
            return `❌ Error changing directory: ${err.message}`;
        }
    }

    try {
        const { stdout, stderr } = await execFilePromise(command, args, { cwd: process.cwd() });
        let out = (stdout || '') + (stderr || '');
        if (!out) out = 'Success (no output)';

        if (out.length > 3000) {
            out = out.substring(0, 3000) + '\n\n(output truncated)';
        }
        return `✅ *Output:*\n\`\`\`\n${out.trim()}\n\`\`\``;
    } catch (err) {
        let msg = err.message;
        if (err.stdout || err.stderr) {
            msg += '\n\n' + err.stdout + err.stderr;
        }
        return `❌ Error executing command:\n\`\`\`\n${msg.trim()}\n\`\`\``;
    }
}

async function runInFolder(command, args, cwd) {
    try {
        const { stdout, stderr } = await execFilePromise(command, args, { cwd });
        let out = (stdout || '') + (stderr || '');
        if (!out) out = 'Success (no output)';
        if (out.length > 2000) out = out.substring(0, 2000) + '\n(output truncated)';
        return `✅\n\`\`\`\n${out.trim()}\n\`\`\``;
    } catch (err) {
        let msg = err.message;
        if (err.stdout || err.stderr) msg += '\n\n' + err.stdout + err.stderr;
        if (msg.length > 2000) msg = msg.substring(0, 2000) + '\n(output truncated)';
        return `❌\n\`\`\`\n${msg.trim()}\n\`\`\``;
    }
}

/**
 * Handle safe remote commands scoped to the active virtual workspace folders.
 * Usage: /cmd-workspace [alias] <command> [args...]
 * If an alias is provided as the first token and matches a workspace folder, the
 * command runs only in that folder. Otherwise it runs in all workspace folders.
 * @param {string} cmdStr - Command string (optionally prefixed with an alias)
 * @param {object} config - Loaded config object
 * @returns {Promise<string>} Output or error message
 */
export async function handleSafeCommandInWorkspace(cmdStr, config) {
    const wsName = config?.activeWorkspace;
    const folders = wsName ? config?.workspaces?.[wsName] : null;

    if (!folders || Object.keys(folders).length === 0) {
        return `❌ No active virtual workspace. Use \`workspace activate <name>\` first.`;
    }

    const parts = cmdStr.trim().match(/[^\s"]+|"[^"]+"/g) || [];
    if (parts.length === 0) return '❌ Error: No command provided.';

    // Check if first token is an alias
    let targetFolders = folders;
    let commandParts = parts;
    if (folders[parts[0]]) {
        targetFolders = { [parts[0]]: folders[parts[0]] };
        commandParts = parts.slice(1);
    }

    if (commandParts.length === 0) return '❌ Error: No command provided after alias.';

    const command = commandParts[0];
    const args = commandParts.slice(1).map(p => p.replace(/^"|"$/g, ''));

    if (!ALLOWED_COMMANDS.includes(command) || command === 'cd') {
        return `❌ Error: Only ${ALLOWED_COMMANDS.filter(c => c !== 'cd').map(c => `'${c}'`).join(', ')} are allowed here ('cd' is not supported in workspace mode).`;
    }

    const entries = Object.entries(targetFolders);
    if (entries.length === 1) {
        const [alias, path] = entries[0];
        const result = await runInFolder(command, args, path);
        return `📂 *${wsName}* › \`${alias}\`\n${result}`;
    }

    const results = await Promise.all(
        entries.map(async ([alias, path]) => {
            const result = await runInFolder(command, args, path);
            return `📂 \`${alias}\`\n${result}`;
        })
    );
    return `*Workspace: ${wsName}*\n\n${results.join('\n\n')}`;
}
