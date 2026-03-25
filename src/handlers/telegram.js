import {
    tgConnect, tgSend, tgChats, tgStatus, tgDisconnect
} from '../services/telegram.js';
import { colors } from '../ui/theme.js';

export async function handleTelegram(args) {
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
