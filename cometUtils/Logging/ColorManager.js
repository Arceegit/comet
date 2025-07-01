class ColorManager {
    static colors = {
        reset: '\x1b[0m',
        background: '\x1b[48;2;0;0;0m', 
        foreground: '\x1b[38;2;255;255;255m', 
        comment: '\x1b[38;2;128;128;128m', 
        cyan: '\x1b[38;2;139;233;253m',
        green: '\x1b[38;2;80;250;123m',
        orange: '\x1b[38;2;255;184;108m',
        pink: '\x1b[38;2;255;121;198m',
        purple: '\x1b[38;2;189;147;249m',
        red: '\x1b[38;2;255;85;85m',
        yellow: '\x1b[38;2;241;250;140m',
    };

    static getColors(type) {
        const typeColors = {
            SYSTEM: { color: this.colors.purple },
            ERROR: { color: this.colors.red },
            WARN: { color: this.colors.orange },
            SUCCESS: { color: this.colors.green },
            INFO: { color: this.colors.cyan },
            DEBUG: { color: this.colors.yellow },
            COMMAND: { color: this.colors.pink }, 
            EVENT: { color: this.colors.pink },
            INTERACTION: { color: this.colors.pink },
            CACHE: { color: this.colors.purple },
            STARTUP: { color: this.colors.green },
            DEFAULT: { color: this.colors.foreground },
            SLASH: { color: this.colors.cyan }, 
            PREFIX: { color: this.colors.orange }, 
        };
        return typeColors[type.toUpperCase()] || typeColors.DEFAULT;
    }

    static formatLogMessage(type, message) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        const { color } = this.getColors(type);
        const c = this.colors;

        const typeString = type.toUpperCase().padEnd(8);

        return `${c.comment}[${timestamp}]${c.reset} ${color}${typeString}${c.reset} ${c.comment}»${c.reset} ${c.foreground}${message}${c.reset}`;
    }
}

module.exports = ColorManager;