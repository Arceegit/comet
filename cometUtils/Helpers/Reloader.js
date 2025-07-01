const fs = require("node:fs");
const path = require("node:path");
const ConfigManager = require('../Core/ConfigManager');
const commandLoader = require('../Loaders/commandLoader');
const eventLoader = require('../Loaders/eventLoader');
const prefixLoader = require('../Loaders/prefixLoader');

class HotReloader {
    constructor(client) {
        this.client = client;
        this.watchedDirs = new Map(); 
        this.rtconfigWatcher = null; 
        this.rtconfigDebounceTimeout = null; 
    }

    isHotReloadEnabled() {
        return ConfigManager.getRtconfig().comet.reloader.enabled;
    }

    start() {
        if (!this.isHotReloadEnabled()) {
            this.client.logs.warn('Hot-reloading is disabled in config.json.');
            return;
        }

        const baseDirs = [
            path.resolve(__dirname, "../../commands"),
            path.resolve(__dirname, "../../events"),
            path.resolve(__dirname, "../../prefix")
        ];

        for (const dir of baseDirs) {
            if (fs.existsSync(dir)) {
                this._watchDirectory(dir);
            } else {
                this.client.logs.warn(`Hot-reload: Directory not found: ${path.relative(process.cwd(), dir)}`);
            }
        }

        this._watchRuntimeConfig();

        this.client.logs.success('Hot-reload system initialized.');
    }

    _watchDirectory(dirPath) {
        if (this.watchedDirs.has(dirPath)) return; 

        const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
            if (!filename) return;

            const fullPath = path.join(dirPath, filename);
            this._handleFileChange(fullPath, eventType);
        });

        watcher.on('error', (error) => {
            this.client.logs.error(`Watcher error for directory ${path.relative(process.cwd(), dirPath)}: ${error.message}`);
            this.watchedDirs.delete(dirPath);
        });

        this.watchedDirs.set(dirPath, watcher);
        this.client.logs.debug(`Watching directory: ${path.relative(process.cwd(), dirPath)}`);
    }

    _watchRuntimeConfig() {
        const rtconfigPath = ConfigManager.rtconfigPath;
        if (this.rtconfigWatcher) return; 

        this.rtconfigWatcher = fs.watch(rtconfigPath, (eventType, filename) => {
            if (eventType === 'change') {
                if (this.rtconfigDebounceTimeout) {
                    clearTimeout(this.rtconfigDebounceTimeout);
                }
                this.rtconfigDebounceTimeout = setTimeout(() => {
                    this.client.logs.info('Detected change in rtconfig.json. Reloading...');
                    ConfigManager.loadRtconfig();
                    this.rtconfigDebounceTimeout = null;
                }, 200); 
            }
        });

        this.rtconfigWatcher.on('error', (error) => {
            this.client.logs.error(`Watcher error for rtconfig.json: ${error.message}`);
            this.rtconfigWatcher = null;
        });
    }

    async _handleFileChange(filePath, eventType) {
        try {
            const exists = fs.existsSync(filePath);
            const isJsFile = filePath.endsWith('.js');

            if (!isJsFile) return;

            const relativePath = path.relative(path.resolve(__dirname, '../..'), filePath);

            if (relativePath.startsWith('commands')) {
                if (exists) {
                    this.client.logs.info(`Hot-reloading command: ${path.basename(filePath)}`);
                    await commandLoader(this.client); 
                } else {
                    this.client.logs.info(`Unloading command: ${path.basename(filePath)}`);
                    await commandLoader(this.client); 
                }
            } else if (relativePath.startsWith('events')) {
                if (exists) {
                    this.client.logs.info(`Hot-reloading event: ${path.basename(filePath)}`);
                    eventLoader.loadEvent(this.client, filePath);
                } else {
                    this.client.logs.info(`Unloading event: ${path.basename(filePath)}`);
                    eventLoader.unloadEvent(this.client, filePath);
                }
            } else if (relativePath.startsWith('prefix')) {
                if (exists) {
                    this.client.logs.info(`Hot-reloading prefix command: ${path.basename(filePath)}`);
                    prefixLoader(this.client); 
                } else {
                    this.client.logs.info(`Unloading prefix command: ${path.basename(filePath)}`);
                    prefixLoader(this.client);
                }
            }
        } catch (error) {
            this.client.logs.error(`Error processing file change for ${path.basename(filePath)}: ${error.message}`);
        }
    }

    stop() {
        for (const watcher of this.watchedDirs.values()) {
            watcher.close();
        }
        this.watchedDirs.clear();
        if (this.rtconfigWatcher) {
            this.rtconfigWatcher.close();
            this.rtconfigWatcher = null;
        }
        if (this.rtconfigDebounceTimeout) {
            clearTimeout(this.rtconfigDebounceTimeout);
            this.rtconfigDebounceTimeout = null;
        }
        this.client.logs.info('Hot-reload system stopped.');
    }
}

module.exports = HotReloader;