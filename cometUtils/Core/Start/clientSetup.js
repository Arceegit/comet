const { Client, GatewayIntentBits, Partials, Options } = require("discord.js");
const Logger = require("../../Logging/Logger.js");
const EnvironmentCheck = require("../../Handlers/EnviromentCheck.js");
const InitializeHandlers = require("../../Handlers/InteractionHandler.js"); 
const commandLoader = require("../../Loaders/commandLoader.js");
const eventLoader = require("../../Loaders/eventLoader.js");
const prefixLoader = require("../../Loaders/prefixLoader.js");
const StatusRotator = require("./statusRotator.js");
const HotReloader = require("../../Helpers/Reloader.js");
const BackupManager = require("../../Backup/BackupManager.js");
const connect = require("../../Connect/connect.js");
const prompt = require("../../Helpers/Prompt.js");
const fs = require('node:fs');

module.exports = async (ConfigManager) => {
    Logger.system("Starting client setup process...");

    let config = ConfigManager.getConfig();
    let configUpdated = false;

    try {
        if (!config.token) {
            Logger.warn("Bot token not found in config.json. Please enter it now:");
            const newToken = await prompt("Enter bot token: ");
            if (newToken) {
                config.token = newToken;
                configUpdated = true;
            } else {
                throw new Error("Bot token is required to proceed.");
            }
        }

        if (!config.prefix) {
            Logger.warn("Bot prefix not found in config.json. Please enter it now:");
            const newPrefix = await prompt("Enter bot prefix (e.g., !): ");
            if (newPrefix) {
                config.prefix = newPrefix;
                configUpdated = true;
            } else {
                Logger.warn("No prefix provided. Commands might not work as expected.");
            }
        }

        if (configUpdated) {
            fs.writeFileSync(ConfigManager.configPath, JSON.stringify(config, null, 2));
            ConfigManager.loadConfig(); 
            Logger.success("config.json updated successfully!");
        }
    } catch (error) {
        Logger.error(`Configuration setup failed: ${error.message}`);
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers
        ],
        partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
        sweepers: {
            messages: { interval: 3600, lifetime: 1800 },
            users: { interval: 3600, filter: () => user => user.bot && user.id !== client.user.id },
            guildMembers: { interval: 3600, filter: () => member => member.user.bot },
            channels: { interval: 3600, lifetime: 3600 },
            threads: { interval: 3600, lifetime: 3600 },
        },
        failIfNotExists: false,
        allowedMentions: { parse: ["users", "roles"], repliedUser: true },
    });

    const aliases = config.aliases || {};
    Object.assign(client, {
        logs: Logger,
        config: ConfigManager,
        commands: new Map(),
        prefixCommands: new Map(),
        connect: (moduleIdentifier) => connect(moduleIdentifier, aliases),
    });

    try {
        Logger.info("Performing environment check...");
        await EnvironmentCheck(client);

        Logger.info("Loading commands...");
        await commandLoader(client);

        Logger.info("Loading prefix commands...");
        prefixLoader(client);

        Logger.info("Loading events...");
        eventLoader.loadAllEvents(client);

        Logger.info("Initializing handlers...");
        InitializeHandlers(client);

    } catch (error) {
        Logger.error(`Core module initialization failed: ${error.message}`);
        console.error(error); 
        process.exit(1);
    }

    client.once('ready', () => {
        Logger.info("Client is ready. Performing post-ready initializations...");
        try {
            const statusRotator = new StatusRotator(client);
            statusRotator.init();

            const hotReloader = new HotReloader(client);
            hotReloader.start();

            const backupManager = new BackupManager(client);
            backupManager.initialize();

            Logger.success("All post-ready initializations complete.");
        } catch (error) {
            Logger.error(`Post-ready initialization failed: ${error.message}`);
            console.error(error); 
        }
    });

    Logger.success("Client setup complete. Returning client instance.");
    return client;
};