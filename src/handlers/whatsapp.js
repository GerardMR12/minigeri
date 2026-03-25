import { waConnect, waSend, waStatus, waDisconnect } from '../services/whatsapp.js';
import { colors } from '../ui/theme.js';

export async function handleWhatsApp(args) {
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
