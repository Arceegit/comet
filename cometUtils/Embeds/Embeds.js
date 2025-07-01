const { EmbedBuilder } = require('discord.js');

const DRACULA_COLORS = {
    background: 0x282A36,
    foreground: 0xF8F8F2,
    comment: 0x6272A4,
    cyan: 0x8BE9FD,
    green: 0x50FA7B,
    orange: 0xFFB86C,
    pink: 0xFF79C6,
    purple: 0xBD93F9,
    red: 0xFF5555,
    yellow: 0xF1FA8C,
};

const DEFAULT_EMBED_COLOR = DRACULA_COLORS.background;

function BaseEmbed(options = {}, client = null) {
    const embed = new EmbedBuilder();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.url) embed.setURL(options.url);

    if (options.color) embed.setColor(options.color);
    else embed.setColor(DEFAULT_EMBED_COLOR);

    if (options.timestamp === true) {
        embed.setTimestamp();
    } else if (options.timestamp) {
        embed.setTimestamp(options.timestamp);
    }

    if (options.image) embed.setImage(options.image);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);

    if (options.author) embed.setAuthor(options.author);

    if (options.fields) embed.addFields(options.fields);

    if (client && client.user) {
        const devBy = client.config.getRtconfig().botInfo.devBy;
        const footerText = devBy ? `${client.user.tag} | ${devBy}` : client.user.tag;
        embed.setFooter({
            text: footerText,
            iconURL: client.user.displayAvatarURL(),
        });
    }

    return embed;
}

function SuccessEmbed(options, client) {
    return BaseEmbed({
        ...options,
        color: DRACULA_COLORS.green,
    }, client);
}

function ErrorEmbed(options, client) {
    return BaseEmbed({
        ...options,
        color: DRACULA_COLORS.red,
    }, client);
}

function InfoEmbed(options, client) {
    return BaseEmbed({
        ...options,
        color: DRACULA_COLORS.cyan,
    }, client);
}

function WarningEmbed(options, client) {
    return BaseEmbed({
        ...options,
        color: DRACULA_COLORS.orange,
    }, client);
}

module.exports = {
    BaseEmbed,
    SuccessEmbed,
    ErrorEmbed,
    InfoEmbed,
    WarningEmbed,
    DRACULA_COLORS,
};