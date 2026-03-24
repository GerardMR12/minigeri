1. Move the `handleWhatsApp`, `handleSlack`, and `handleTelegram` command handler functions from `src/minigeri.js` into dedicated files under `src/handlers/`.
2. This creates `src/handlers/whatsapp.js`, `src/handlers/slack.js`, and `src/handlers/telegram.js`.
3. Update `src/minigeri.js` to import these handler functions from the new files.
4. Remove the extracted function definitions from `src/minigeri.js`.
5. Verify `src/minigeri.js` and the new files pass `node --check`.
