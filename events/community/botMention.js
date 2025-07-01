const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        if (message.mentions.users.has(client.user.id)) {
            try {
                const config = client.config.getConfig();
                await message.reply({
                    content: `Hello ${message.author.username}! How can I assist you today? My prefix is \`${config.prefix}\`.`,
                    allowedMentions: { repliedUser: true }
                });
            } catch (error) {
                client.logs.error(`Failed to respond to bot mention: ${error.message}`);
            }
        }
    },
};