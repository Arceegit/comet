const path = require('node:path');
const { Events } = require('discord.js');
const { getFilesRecursively } = require('../Helpers/FileLoader');
const { isPrivilegedUser } = require('../Helpers/AuthUtils');

const loadedEventHandlers = new Map();

const validEvents = Object.values(Events);

function loadEvent(client, filePath) {
    try {
        unloadEvent(client, filePath);

        delete require.cache[require.resolve(filePath)];
        const event = require(filePath);

        if (!event.name || !event.execute || !validEvents.includes(event.name)) {
            client.logs.warn(`Invalid event: ${filePath} - Missing name, execute, or invalid event name.`);
            return;
        }

        const wrappedExecute = async (...args) => {
            const rtconfig = client.config.getRtconfig();
            let user = null;

            if (event.name === Events.MessageCreate || event.name === Events.MessageUpdate || event.name === Events.MessageDelete) {
                user = args[0]?.author; 
            } else if (event.name === Events.InteractionCreate) {
                user = args[0]?.user;
            } else if (args[0] && args[0].id) { 
                user = args[0];
            }

            if (rtconfig.botSettings.maintenanceMode && user && !isPrivilegedUser(user.id)) {
                if (event.name === Events.MessageCreate && args[0]?.reply) {}
                return;
            }
            await event.execute(...args, client);
        };

        if (event.once) {
            client.once(event.name, wrappedExecute);
        } else {
            client.on(event.name, wrappedExecute);
        }
        loadedEventHandlers.set(filePath, { name: event.name, once: event.once, handlerFunction: wrappedExecute });
        client.logs.event(`Loaded event: ${event.name} from ${path.basename(filePath)}`);
    } catch (error) {
        client.logs.error(`Failed to load event ${path.basename(filePath)}: ${error.message}`);
    }
}

function unloadEvent(client, filePath) {
    const handlerInfo = loadedEventHandlers.get(filePath);
    if (handlerInfo) {
        if (handlerInfo.once) {
            client.removeListener(handlerInfo.name, handlerInfo.handlerFunction);
        } else {
            client.removeListener(handlerInfo.name, handlerInfo.handlerFunction);
        }
        loadedEventHandlers.delete(filePath);
        client.logs.event(`Unloaded event: ${handlerInfo.name} from ${path.basename(filePath)}`);
    }
}

function loadAllEvents(client) {
    const eventsPath = path.join(__dirname, "..", '..', "events");
    const eventFiles = getFilesRecursively(eventsPath);
    let loadedCount = 0;

    for (const filePath of eventFiles) {
        loadEvent(client, filePath);
        loadedCount++;
    }
    client.logs.event(`Total events loaded: ${loadedCount}`);
}

module.exports = {
    loadEvent,
    unloadEvent,
    loadAllEvents
};