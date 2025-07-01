const ColorManager = require('./ColorManager');
const Banner = require('./Banner');
const fs = require('node:fs');
const path = require('node:path');

class LogManager {
    constructor() {
        this.bannerShown = false;
        this.logDirectory = path.join(process.cwd(), 'logs');
        this.errorLogDirectory = path.join(this.logDirectory, 'errors');
        this.logLevels = {
            'SYSTEM': 0,
            'STARTUP': 1,
            'SUCCESS': 2,
            'INFO': 3,
            'COMMAND': 4,
            'EVENT': 5,
            'INTERACTION': 6,
            'PREFIX': 7,
            'SLASH': 8,
            'CACHE': 9,
            'WARN': 10,
            'ERROR': 11,
            'DEBUG': 12,
        };

        this.ensureLogDirectoriesExist();
        this.logLevel = this.getLogLevel();
    }

    ensureLogDirectoriesExist() {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
        if (!fs.existsSync(this.errorLogDirectory)) {
            fs.mkdirSync(this.errorLogDirectory, { recursive: true });
        }
    }

    getLogLevel() {
        return this.logLevels['INFO'];
    }

    getCurrentLogFileName() {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `comet-${year}-${month}-${day}.log`;
    }

    writeToLogFile(type, rawMessage, stackTrace = null) {
        const logFileName = this.getCurrentLogFileName();
        const logFilePath = path.join(this.logDirectory, logFileName);
        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] [${type}] ${rawMessage}\n`;

        if (stackTrace) {
            logEntry += `${stackTrace}\n`;
        }

        fs.appendFileSync(logFilePath, logEntry, 'utf8');

        if (type === 'ERROR' && stackTrace) {
            const errorFileName = `error-${Date.now()}.log`;
            const errorFilePath = path.join(this.errorLogDirectory, errorFileName);
            fs.writeFileSync(errorFilePath, logEntry, 'utf8');
        }
    }

    showBanner(version) {
        if (!this.bannerShown) {
            console.log(Banner.getStartupBanner(version));
            this.bannerShown = true;
        }
    }

    divider() {
        const c = ColorManager.colors;
        console.log(c.comment + '═'.repeat(process.stdout.columns || 55) + c.reset);
    }

    log(type, message, stackTrace = null) {
        if (this.logLevels[type] === undefined || this.logLevels[type] < this.logLevel) {
            return; 
        }

        const formattedMessage = ColorManager.formatLogMessage(type, message);
        console.log(formattedMessage);
        this.writeToLogFile(type, message, stackTrace);
    }

    system(message) { this.log('SYSTEM', message); }
    warn(message) { this.log('WARN', message); }
    error(message, stackTrace = null) { this.log('ERROR', message, stackTrace); }
    success(message) { this.log('SUCCESS', message); }
    debug(message) { this.log('DEBUG', message); }
    command(message) { this.log('COMMAND', message); }
    event(message) { this.log('EVENT', message); }
    startup(message) { this.log('STARTUP', message); }
    cache(message) { this.log('CACHE', message); }
    interaction(message) { this.log('INTERACTION', message); }
    info(message) { this.log('INFO', message); }
    prefix(message) { this.log('PREFIX', message); }
    slash(message) { this.log('SLASH', message); }
}

module.exports = new LogManager();