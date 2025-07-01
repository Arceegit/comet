const ConfigManager = require('./cometUtils/Core/ConfigManager');
const clientSetup = require("./cometUtils/Core/Start/clientSetup.js");
const ProcessHandler = require('./cometUtils/Handlers/ProcessHandler');
const Logger = require('./cometUtils/Logging/Logger');

async function startBot() {
    Logger.showBanner('B1');

    try {
        ConfigManager.loadConfig();
        ConfigManager.loadRtconfig();

        ProcessHandler.setup();

        const client = await clientSetup(ConfigManager);
        ProcessHandler.setClient(client);

        Logger.info("Logging in to Discord...");
        await client.login(ConfigManager.getConfig().token);
        Logger.success('Successfully logged in!');

    } catch (error) {
        Logger.error(`Failed to start the bot: ${error.message}`);
        console.error(error); 
        process.exit(1);
    }
}

startBot();