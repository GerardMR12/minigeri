import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

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

    if (!['cd', 'mkdir', 'ls'].includes(command)) {
        return `❌ Error: Only 'cd', 'mkdir', and 'ls' are allowed for safety.`;
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
            out = out.substring(0, 3000) + '\\n\\n(output truncated)';
        }
        return `✅ *Output:*\\n\`\`\`\\n${out.trim()}\\n\`\`\``;
    } catch (err) {
        let msg = err.message;
        if (err.stdout || err.stderr) {
            msg += '\\n\\n' + err.stdout + err.stderr;
        }
        return `❌ Error executing command:\\n\`\`\`\\n${msg.trim()}\\n\`\`\``;
    }
}
