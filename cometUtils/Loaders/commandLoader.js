const { REST, Routes } = require('discord.js');
const path = require('node:path');
const { getFilesRecursively } = require('../Helpers/FileLoader');

async function updateDiscordCommands(client, commands) {
    const config = client.config.getConfig();

    if (!client.user?.id) {
        client.logs.error('SLASH » Cannot register commands: Bot client ID is not available.');
        return;
    }

    const rest = new REST().setToken(config.token);
    const botID = client.user.id;

    const globalCommands = [];
    const guildCommands = [];

    commands.forEach(cmd => {
        if (cmd.devGuild) {
            guildCommands.push(cmd.data.toJSON());
        } else {
            globalCommands.push(cmd.data.toJSON());
        }
    });

    try {
        client.logs.slash(`Started refreshing ${commands.length} application (/) commands.`);

        await rest.put(
            Routes.applicationCommands(botID),
            { body: globalCommands },
        );
        client.logs.slash(`Successfully reloaded ${globalCommands.length} global application (/) commands.`);

        if (config.devGuild && guildCommands.length > 0) {
            await rest.put(
                Routes.applicationGuildCommands(botID, config.devGuild),
                { body: guildCommands },
            );
            client.logs.slash(`Successfully reloaded ${guildCommands.length} guild application (/) commands for ${config.devGuild}.`);
        }

    } catch (error) {
        client.logs.error(`SLASH » Failed to refresh application commands: ${error.message}`);
        console.error(error);
    }
}

module.exports = async function RegisterCommands(client) {
    client.commands = new Map();
    const commandsPath = path.join(__dirname, '..', '..', 'commands');
    const commandFiles = getFilesRecursively(commandsPath);
    let loadedCount = 0;

    for (const filePath of commandFiles) {
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                loadedCount++;
            } else {
                client.logs.warn(`SLASH » The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            client.logs.error(`SLASH » Failed to load command at ${filePath}: ${error.message}`);
        }
    }

    client.logs.slash(`Loaded ${loadedCount} slash command(s).`);

    if (client.isReady()) {
        await updateDiscordCommands(client, Array.from(client.commands.values()));
    } else {
        client.once('ready', async () => {
            await updateDiscordCommands(client, Array.from(client.commands.values()));
        });
    }

    return client.commands;
}