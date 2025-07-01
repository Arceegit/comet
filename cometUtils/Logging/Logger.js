const logManager = require('./LoggerManager');

class Logger {
    constructor() {}

    system = (message) => logManager.log('SYSTEM', message);
    warn = (message) => logManager.log('WARN', message);
    error = (message, stackTrace = null) => logManager.error(message, stackTrace);
    success = (message) => logManager.log('SUCCESS', message);
    debug = (message) => logManager.log('DEBUG', message);
    command = (message) => logManager.log('COMMAND', message); 
    event = (message) => logManager.log('EVENT', message);
    startup = (message) => logManager.log('STARTUP', message);
    cache = (message) => logManager.log('CACHE', message);
    interaction = (message) => logManager.log('INTERACTION', message);
    info = (message) => logManager.log('INFO', message);
    prefix = (message) => logManager.log('PREFIX', message); 
    slash = (message) => logManager.log('SLASH', message);   

    showBanner(version) { 
        logManager.showBanner(version);
    }

    divider() { 
        logManager.divider();
    }
}

module.exports = new Logger();