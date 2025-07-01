const path = require('node:path');
const { getFilesRecursively } = require('../Helpers/FileLoader');

module.exports = (client) => {
    client.prefixCommands = new Map();
    const prefixCommandsPath = path.join(__dirname, '..', '..', 'prefix');
    const commandFiles = getFilesRecursively(prefixCommandsPath);
    let loadedCommands = 0;

    for (const filePath of commandFiles) {
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            const checks = {
                command: 'command',
                execute: 'execute'
            };

            const missingProperty = Object.entries(checks).find(([key]) => !command[key]);

            if (missingProperty) {
                client.logs.warn(`PREFIX » The prefix command at ${filePath} is missing a required "${missingProperty[0]}" ${missingProperty[1]}.`);
                continue;
            }

            if (client.prefixCommands.has(command.command)) {
                client.logs.warn(`PREFIX » The prefix command "${command.command}" is already loaded.`);
                continue;
            }

            if (command.aliases?.length) {
                for (const alias of command.aliases) {
                    if (client.prefixCommands.has(alias)) {
                        client.logs.warn(`PREFIX » The alias "${alias}" for the prefix command "${command.command}" is already loaded.`);
                        continue;
                    }

                    client.prefixCommands.set(alias, command);
                    client.logs.prefix(`Alias: "${alias}" for command: "${command.command}"`);
                }
            }

            client.prefixCommands.set(command.command, command);
            loadedCommands++;
        } catch (error) {
            client.logs.error(`PREFIX » Failed to load prefix command at ${filePath}: ${error.message}`);
        }
    }

    client.logs.prefix(`Loaded ${loadedCommands} prefix command(s).`);
}
