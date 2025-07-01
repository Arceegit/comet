const fs = require('node:fs');
const path = require('node:path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(process.cwd(), 'config.json');
        this.rtconfigPath = path.join(process.cwd(), 'rtconfig.json');
        this.config = {};
        this.rtconfig = {};
        this.rtconfigChangeCallbacks = [];
    }

    loadConfig() {
        try {
            this.config = require(this.configPath);
            delete require.cache[require.resolve(this.configPath)];
        } catch (error) {
            console.error(`[ConfigManager] Error loading config.json: ${error.message}`);
            process.exit(1);
        }
    }

    loadRtconfig() {
        try {
            let newRtconfig = {};
            if (fs.existsSync(this.rtconfigPath)) {
                delete require.cache[require.resolve(this.rtconfigPath)];
                newRtconfig = require(this.rtconfigPath);
            }

            if (!newRtconfig.blacklistedUsers) {
                newRtconfig.blacklistedUsers = [];
            }
            if (!newRtconfig.blacklistedGuilds) {
                newRtconfig.blacklistedGuilds = [];
            }

            if (JSON.stringify(this.rtconfig) !== JSON.stringify(newRtconfig)) {
                this.rtconfig = newRtconfig;
                fs.writeFileSync(this.rtconfigPath, JSON.stringify(this.rtconfig, null, 2), 'utf8');
                for (const callback of this.rtconfigChangeCallbacks) {
                    callback(this.rtconfig);
                }
            }
        } catch (error) {
            console.error(`[ConfigManager] Error loading rtconfig.json: ${error.message}`);
        }
    }

    get(key) {
        if (key in this.config) {
            return this.config[key];
        } else if (key in this.rtconfig) {
            return this.rtconfig[key];
        } else {
            return undefined;
        }
    }

    getConfig() {
        return this.config;
    }

    getRtconfig() {
        return this.rtconfig;
    }

    addRtconfigChangeCallback(callback) {
        this.rtconfigChangeCallbacks.push(callback);
    }
}

module.exports = new ConfigManager();