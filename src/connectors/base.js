/**
 * Base Connector class — all messaging platform connectors extend this.
 * Connectors receive messages from external platforms and route them to agents.
 */
export class BaseConnector {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.onMessage = null; // callback: (message, sender, reply) => {}
    }

    /**
     * Start listening for incoming messages.
     */
    async start() {
        throw new Error(`Connector "${this.name}" does not implement start()`);
    }

    /**
     * Stop the connector.
     */
    async stop() {
        throw new Error(`Connector "${this.name}" does not implement stop()`);
    }

    /**
     * Set the message handler — called when a new message arrives.
     * @param {function} handler - (message: string, sender: object, reply: function) => Promise<void>
     */
    setMessageHandler(handler) {
        this.onMessage = handler;
    }
}
