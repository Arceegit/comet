const ConfigManager = require('../Core/ConfigManager');
const fs = require('node:fs');
const path = require('node:path');

let clientInstance = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
let crashLogPath = null;

function setup() {
    const rtconfig = ConfigManager.getRtconfig();
    const CRASH_LOG_DIR = path.join(process.cwd(), 'logs', 'crashes');
    crashLogPath = path.join(CRASH_LOG_DIR, `crash-${Date.now()}.log`);

    process.on('unhandledRejection', async (reason, promise) => {
        console.error('UNHANDLED REJECTION:', reason);
        await handleCrash(reason);
    });

    process.on('uncaughtException', async (error) => {
        console.error('UNCAUGHT EXCEPTION:', error);
        await handleCrash(error);
    });

    process.on('SIGINT', () => {
        if (clientInstance && clientInstance.isReady()) {
            clientInstance.logs.warn('SIGINT received. Shutting down gracefully...');
            clientInstance.destroy();
        }
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        if (clientInstance && clientInstance.isReady()) {
            clientInstance.logs.warn('SIGTERM received. Shutting down gracefully...');
            clientInstance.destroy();
        }
        process.exit(0);
    });
}

async function handleCrash(error) {
    const rtconfig = ConfigManager.getRtconfig();
    const MAX_RECONNECT_ATTEMPTS = rtconfig.comet.crashes.maxRetries || 5;
    const BASE_RETRY_DELAY_SECONDS = rtconfig.comet.crashes.retryDelaySeconds || 10;
    const SAVE_CRASH_LOGS = rtconfig.comet.crashes.saveLogs || false;

    if (SAVE_CRASH_LOGS) {
        try {
            const CRASH_LOG_DIR = path.dirname(crashLogPath);
            if (!fs.existsSync(CRASH_LOG_DIR)) {
                fs.mkdirSync(CRASH_LOG_DIR, { recursive: true });
            }
            fs.writeFileSync(crashLogPath, `Crash Report - ${new Date().toISOString()}\nError: ${error.stack || error.message}`);
            clientInstance?.logs.error(`Crash log saved to ${crashLogPath}`);
        } catch (logError) {
            clientInstance?.logs.error(`Failed to save crash log: ${logError.message}`);
        }
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = BASE_RETRY_DELAY_SECONDS * Math.pow(2, reconnectAttempts - 1);
        clientInstance?.logs.warn(`Attempting to reconnect in ${delay} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(async () => {
            try {
                if (clientInstance && clientInstance.isReady()) {
                    clientInstance.logs.info('Client already ready, skipping reconnect.');
                    reconnectAttempts = 0; 
                    return;
                }
                clientInstance?.logs.info('Reconnecting bot...');
                await clientInstance.login(ConfigManager.getConfig().token);
                clientInstance?.logs.success('Bot reconnected successfully!');
                reconnectAttempts = 0;
            } catch (reconnectError) {
                clientInstance?.logs.error(`Failed to reconnect: ${reconnectError.message}`);
                handleCrash(reconnectError);
            }
        }, delay * 1000);
    } else {
        clientInstance?.logs.error('Max reconnect attempts reached. Shutting down.');
        process.exit(1);
    }
}

function setClient(client) {
    clientInstance = client;
    clientInstance.on('shardDisconnect', (event, id) => {
        clientInstance.logs.error(`Shard ${id} disconnected with code ${event.code}. Attempting reconnect...`);
        handleCrash(new Error(`Shard ${id} disconnected`));
    });

    clientInstance.on('shardError', (error, id) => {
        clientInstance.logs.error(`Shard ${id} encountered an error: ${error.message}. Attempting reconnect...`);
        handleCrash(error);
    });

    clientInstance.on('shardReconnecting', (id) => {
        clientInstance.logs.warn(`Shard ${id} is reconnecting...`);
    });

    clientInstance.on('shardResume', (id, replayed) => {
        clientInstance.logs.success(`Shard ${id} resumed. Replayed ${replayed} events.`);
        reconnectAttempts = 0; 
    });
}

module.exports = {
    setup,
    setClient,
};