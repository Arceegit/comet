const { isPrivilegedUser } = require('../Helpers/AuthUtils');

function createHandler(client) {
    const cooldowns = new Map();

    async function handleError(context, error) {
        const errorId = Math.random().toString(36).substring(2, 15);
        client.logs.error(`Error ID ${errorId}: ${error.message} in ${context.commandName || 'Unknown Command'}`, error.stack);
        console.error(error.stack);

        try {
            if (!context.replied && !context.deferred) {
                const errorEmbed = {
                    color: 0xe74c3c,
                    title: "Error",
                    description: `An unexpected error occurred. Error ID: ${errorId}.`,
                };
                await context.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (sendError) {
            client.logs.error(`Failed to send error message for ${errorId}: ${sendError.message}`);
        }
    }

    const validationChecks = {
        maintenance: (context) => {
            const rtconfig = client.config.getRtconfig();
            return {
                valid: !rtconfig.botSettings.maintenanceMode || isPrivilegedUser(context.user?.id || context.author?.id),
                message: "The bot is currently under maintenance. Please try again later."
            };
        },
        guildOnly: (context, command) => ({
            valid: !command.guildOnly || context.guild,
            message: "This command can only be used within a server."
        }),
        developer: (context, command) => ({
            valid: !command.devOnly || isPrivilegedUser(context.user?.id || context.author?.id),
            message: "This command is restricted to developers only."
        }),
        devGuild: (context, command) => {
            const config = client.config.getConfig();
            return {
                valid: !command.devGuild || context.guild?.id === config.devGuild,
                message: "This command can only be used in the development server."
            };
        },
        permissions: (context, command) => {
            if (!command.perms?.length || !context.guild) return { valid: true };
            if (isPrivilegedUser(context.user?.id || context.author?.id)) return { valid: true };
            
            const member = context.member;
            if (!member) return { valid: false, message: "Could not verify your permissions in this server." };
            
            const missingPerms = command.perms.filter(perm => !member.permissions.has(perm));
            return {
                valid: missingPerms.length === 0,
                message: `You are missing the following permissions: ${missingPerms.join(", ")}.`
            };
        },
        cooldown: (context, command) => {
            if (!command.cooldown || isPrivilegedUser(context.user?.id || context.author?.id)) {
                return { valid: true };
            }

            const commandName = context.commandName || command.command;
            const subCommand = context.options?.getSubcommand(false);
            const cooldownKey = subCommand ? `${commandName}-${subCommand}` : commandName;

            const timestamps = cooldowns.get(cooldownKey) || new Map();
            const now = Date.now();
            const cooldownAmount = command.cooldown * 1000;
            const userExpiration = timestamps.get(context.user?.id || context.author?.id);

            if (userExpiration && now < userExpiration) {
                const timeLeft = (userExpiration - now) / 1000;
                return {
                    valid: false,
                    message: `Please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`${commandName}\` command.`
                };
            }

            timestamps.set(context.user?.id || context.author?.id, now + cooldownAmount);
            cooldowns.set(cooldownKey, timestamps);
            setTimeout(() => timestamps.delete(context.user?.id || context.author?.id), cooldownAmount);
            
            return { valid: true };
        },
        blacklist: (context) => {
            const rtconfig = client.config.getRtconfig();
            const userId = context.user?.id || context.author?.id;
            const guildId = context.guild?.id;

            if (rtconfig.blacklistedUsers.includes(userId)) {
                return { valid: false, message: "You are blacklisted from using this bot." };
            }
            if (guildId && rtconfig.blacklistedGuilds.includes(guildId)) {
                return { valid: false, message: "This server is blacklisted from using this bot." };
            }
            return { valid: true };
        }
    };

    async function validateAndExecute(context, command, args = [], isComponent = false) {
        const user = context.user || context.author;
        const commandName = context.commandName || command.command || (isComponent ? context.customId : 'unknown');
        const rtconfig = client.config.getRtconfig();

        const applicableChecks = ["maintenance", "guildOnly", "developer", "devGuild", "permissions", "cooldown", "blacklist"];
        for (const checkName of applicableChecks) {
            const result = validationChecks[checkName](context, command);
            if (!result.valid) {
                client.logs.warn(`Blocked ${commandName} for ${user.tag}: ${result.message}`);
                try {
                    if (!context.replied && !context.deferred) {
                        await context.reply({
                            embeds: [{ color: 0xf1c40f, title: "Access Denied", description: result.message }],
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    client.logs.error(`Failed to send validation error for ${commandName}: ${e.message}`);
                }
                return;
            }
        }

        if (rtconfig.botSettings?.commandLogging && (context.isCommand?.() || isComponent)) {
            const logMessage = `"${commandName}" executed by ${user.tag} (${user.id}) in ${context.guild ? context.guild.name : 'DMs'}`;
            client.logs.command(logMessage);
        }

        try {
            if (isComponent) {
                await command.execute(context, args, client);
            } else if (context.isCommand?.()) {
                await command.execute(context, client);
            } else {
                await command.execute(context, args, client);
            }
        } catch (error) {
            await handleError(context, error);
        }
    }

    function parseCustomId(customId) {
        const [baseId, ...args] = customId.split("_");
        return { baseId, args };
    }

    async function handleInteraction(interaction) {
        client.logs.interaction(`Processing interaction ${interaction.id} from ${interaction.user.tag}`);

        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                client.logs.warn(`Unknown slash command: ${interaction.commandName}`);
                return;
            }
            await validateAndExecute(interaction, command);
        } else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
            const { baseId, args } = parseCustomId(interaction.customId);
            const component = client.components.get(baseId);

            if (!component) {
                client.logs.warn(`Unknown component with base ID: ${baseId}`);
                return;
            }

            if (component.interactionUserOnly && args[0] && args[0] !== interaction.user.id) {
                return interaction.reply({
                    embeds: [{ color: 0xf1c40f, title: "Access Denied", description: "You are not authorized to use this component." }],
                    ephemeral: true
                });
            }
            await validateAndExecute(interaction, component, args, true);
        }
    }

    async function handleMessage(message) {
        const rtconfig = client.config.getRtconfig();
        const userId = message.author.id;
        const guildId = message.guild?.id;

        if (rtconfig.blacklistedUsers.includes(userId)) {
            client.logs.warn(`Blocked message from blacklisted user: ${userId}`);
            return;
        }
        if (guildId && rtconfig.blacklistedGuilds.includes(guildId)) {
            client.logs.warn(`Blocked message from blacklisted guild: ${guildId}`);
            return;
        }

        const config = client.config.getConfig();
        if (!message.content.startsWith(config.prefix) || message.author.bot) return;

        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.prefixCommands.get(commandName);

        if (command) {
            if (rtconfig.botSettings?.commandLogging) {
                client.logs.prefix(`Processing prefix command "${commandName}" from ${message.author.tag}`);
            }
            await validateAndExecute(message, command, args);
        }
    }

    client.handleInteraction = handleInteraction;
    client.handleMessage = handleMessage;

    client.logs.success("Interaction handler is ready.");
    return { handleInteraction, handleMessage };
}

module.exports = (client) => {
    const handler = createHandler(client);
    client.on("interactionCreate", handler.handleInteraction);
    client.on("messageCreate", handler.handleMessage);
    client.logs.info("Attached interaction and message listeners.");
    return handler;
};