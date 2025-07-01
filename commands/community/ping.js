const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks the bot latency.'),
    async execute(interaction, client) {
        const { InfoEmbed } = client.connect('@embeds'); 

        const sent = await interaction.reply({
            content: 'Pinging...',
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = InfoEmbed({
            title: '🏓 Pong!',
            description: 'Here are the latency details:',
            fields: [
                { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            ],
            timestamp: true 
        }, client); 

        await interaction.editReply({
            content: '',
            embeds: [embed],
        });
    },
};