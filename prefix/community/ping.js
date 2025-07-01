module.exports = {
    command: 'ping',
    aliases: ['p', 'latency'],
    description: 'Checks the bot latency.',
    async execute(message, args, client) {
        const { InfoEmbed } = client.connect('@embeds'); 

        const sent = await message.reply({
            content: 'Pinging...',
        });

        const latency = sent.createdTimestamp - message.createdTimestamp;
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

        await sent.edit({
            content: '',
            embeds: [embed]
        });
    },
};