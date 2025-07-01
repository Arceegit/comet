const { ActivityType } = require('discord.js');

class StatusRotator {
    constructor(client) {
        this.client = client;
        this.interval = null;
        this.currentIndex = 0;
        this.currentConfig = {};

        client.config.addRtconfigChangeCallback(this._loadAndApplyConfig.bind(this));
    }

    init() {
        this._loadAndApplyConfig(this.client.config.getRtconfig());

        if (this.currentConfig.enabled && this.currentConfig.statuses.length > 0) {
            this._startRotation();
        } else {
            this.client.logs.warn('STATUS » Status Rotator is disabled or no statuses are provided in rtconfig.json.');
            this.client.user.setPresence({ activities: [{ name: 'Powered by Comet', type: ActivityType.Custom }] });
        }
    }

    _handleRuntimeConfigChange(newRuntimeConfig) {
        const oldStatusRotatorConfig = this.currentConfig; 

        this._loadAndApplyConfig(newRtconfig);

        const newStatusRotatorConfig = this.currentConfig; 

        const enabledChanged = oldStatusRotatorConfig.enabled !== newStatusRotatorConfig.enabled;
        const intervalChanged = oldStatusRotatorConfig.intervalSeconds !== newStatusRotatorConfig.intervalSeconds;
        const statusesChanged = JSON.stringify(oldStatusRotatorConfig.statuses) !== JSON.stringify(newStatusRotatorConfig.statuses);

        const configChanged = enabledChanged || intervalChanged || statusesChanged;


        if (configChanged) {
            this.client.logs.info('STATUS » Status Rotator configuration changed. Re-initializing...');
            this._stopRotation();

            if (newStatusRotatorConfig.enabled && newStatusRotatorConfig.statuses.length > 0) {
                this._startRotation();
            } else {
                this.client.logs.warn('STATUS » Status Rotator is now disabled or has no statuses.');
                this.client.user.setPresence({ activities: [{ name: 'Powered by Comet', type: ActivityType.Custom }] });
            }
        }
    }

    _loadAndApplyConfig(rtconfig) {
        const statusRotatorConfig = rtconfig.botInfo.statusRotator;
        const statusesArray = rtconfig.botInfo.statuses;

        this.currentConfig = {
            enabled: statusRotatorConfig.enabled,
            intervalSeconds: statusRotatorConfig.intervalSeconds,
            statuses: JSON.parse(JSON.stringify(statusesArray))
        };
    }

    _startRotation() {
        this._stopRotation(); 

        const intervalSeconds = this.currentConfig.intervalSeconds || 60;
        this.client.logs.info(`STATUS » Status Rotator enabled. Rotating every ${intervalSeconds} seconds.`);

        this._rotate(); 

        this.interval = setInterval(() => this._rotate(), intervalSeconds * 1000);
    }

    _stopRotation() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.client.logs.info('STATUS » Status Rotator stopped.');
        }
    }

    _rotate() {
        if (this.currentConfig.statuses.length === 0) return;

        const status = this.currentConfig.statuses[this.currentIndex];
        if (!status || !status.text) {
            this.client.logs.warn(`STATUS » Invalid status at index ${this.currentIndex}. Skipping.`);
            this._updateIndex();
            return;
        }

        const activity = {
            name: status.text
        };

        switch (status.type.toUpperCase()) {
            case 'PLAYING':
                activity.type = ActivityType.Playing;
                break;
            case 'LISTENING':
                activity.type = ActivityType.Listening;
                break;
            case 'WATCHING':
                activity.type = ActivityType.Watching;
                break;
            case 'COMPETING':
                activity.type = ActivityType.Competing;
                break;
            case 'CUSTOM':
                activity.type = ActivityType.Custom;
                break;
            default:
                this.client.logs.warn(`STATUS » Invalid activity type "${status.type}". Defaulting to CUSTOM.`);
                activity.type = ActivityType.Custom;
                break;
        }

        try {
            this.client.user.setPresence({ activities: [activity], status: 'online' });
            this.client.logs.system(`STATUS » Status updated: ${status.type.toUpperCase()} -> ${status.text}`);
        } catch (error) {
            this.client.logs.error(`STATUS » Failed to set presence: ${error.message}`);
        }

        this._updateIndex();
    }

    _updateIndex() {
        this.currentIndex = (this.currentIndex + 1) % this.currentConfig.statuses.length;
    }
}

module.exports = StatusRotator;
