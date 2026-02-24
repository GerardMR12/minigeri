// Connector registry — messaging platform connectors will be registered here.
// Future: import { WhatsAppConnector } from './whatsapp.js';

const CONNECTOR_REGISTRY = {
    // 'whatsapp': WhatsAppConnector,
    // 'telegram': TelegramConnector,
};

export function createConnector(name, config = {}) {
    const ConnectorClass = CONNECTOR_REGISTRY[name];
    if (!ConnectorClass) {
        const available = Object.keys(CONNECTOR_REGISTRY);
        if (available.length === 0) {
            throw new Error(`No connectors installed yet. Coming soon: whatsapp, telegram`);
        }
        throw new Error(`Unknown connector: "${name}". Available: ${available.join(', ')}`);
    }
    return new ConnectorClass(config);
}

export function listConnectorNames() {
    return Object.keys(CONNECTOR_REGISTRY);
}

export { CONNECTOR_REGISTRY };
