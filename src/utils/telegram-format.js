/**
 * Formats standard Markdown (e.g., from Gemini) to Telegram-compatible Markdown.
 * Note: Telegram's `Markdown` (V1) expects *bold*, _italic_, etc.
 * Gemini outputs **bold**, *italic*, `# Headers`, and lists.
 */
export function formatTelegramMarkdown(text) {
    if (!text) return '';

    let md = text;

    // 1. Convert headers to bold
    // e.g. "## Header" -> "*Header*"
    md = md.replace(/^#+\s+(.*)$/gm, '*$1*');

    // 2. Convert standard bold to Telegram bold
    // e.g. "**bold**" -> "*bold*"
    md = md.replace(/\*\*(.*?)\*\*/g, '*$1*');

    // 3. Convert asterisks in lists to bullet symbols to prevent unclosed bold tags
    // e.g. "* item" -> "• item"
    md = md.replace(/^\s*\*\s+/gm, '• ');
    md = md.replace(/^\s*\-\s+/gm, '• ');

    // 4. Strikethrough is not supported in Markdown V1, so we remove the tildes
    // e.g. "~~text~~" -> "text"
    md = md.replace(/~~(.*?)~~/g, '$1');

    return md;
}

/**
 * Splits a long message into chunks that fit within Telegram's 4096 char limit.
 */
export function splitTelegramMessage(text, limit = 4000) {
    if (!text) return [];
    if (text.length <= limit) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= limit) {
            chunks.push(remaining);
            break;
        }

        let breakPoint = remaining.lastIndexOf('\n\n', limit);
        if (breakPoint === -1) breakPoint = remaining.lastIndexOf('\n', limit);
        if (breakPoint === -1) breakPoint = remaining.lastIndexOf(' ', limit);
        if (breakPoint === -1) breakPoint = limit;

        chunks.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint).trimStart();
    }

    return chunks;
}
